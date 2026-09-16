import { randomUUID } from 'node:crypto';
import { AgentInvocationError } from '../agents/agentInvocationService.ts';
import { CollaborationValidationError } from '../../core/collaboration/collaboration.ts';
import { assertExecutionCheckpoint, assertExecutionTransition, ExecutionError, isTerminalExecution, type Execution, type ExecutionAction, type ExecutionStatus } from '../../core/executions/execution.ts';
import type { TaskRepository } from '../tasks/taskRepository.ts';
import type { WorkspaceRepository } from '../workspaces/workspaceRepository.ts';
import type { ExecutionRepository } from './executionRepository.ts';
import type { ExecutionRuntime } from './executionRuntime.ts';

export class ExecutionService {
  private readonly repository: ExecutionRepository;
  private readonly workspaces: WorkspaceRepository;
  private readonly tasks: TaskRepository;
  private readonly runtime: ExecutionRuntime;
  private readonly active = new Map<string, Promise<void>>();
  private readonly storageFaults = new Set<string>();
  private closing = false;

  constructor(repository: ExecutionRepository, workspaces: WorkspaceRepository, tasks: TaskRepository, runtime: ExecutionRuntime) {
    this.repository = repository; this.workspaces = workspaces; this.tasks = tasks; this.runtime = runtime;
  }

  create(workspaceId: string, input: unknown): Execution {
    this.requireWorkspace(workspaceId);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ExecutionError('invalid_input', 'Execution input is required.');
    const body = input as Record<string, unknown>;
    if (body.taskId !== undefined && body.taskId !== null && typeof body.taskId !== 'string') throw new ExecutionError('invalid_input', 'Task ID must be a string or null.');
    const taskId = typeof body.taskId === 'string' ? body.taskId : null;
    if (taskId !== null && this.tasks.getById(taskId)?.workspaceId !== workspaceId) throw new ExecutionError('not_found', 'Linked Task was not found in this Workspace.');
    if (body.pauseAfterStep !== undefined && typeof body.pauseAfterStep !== 'boolean') throw new ExecutionError('invalid_input', 'Pause-after-step must be a boolean.');
    const plan = this.runtime.prepare(body);
    const timestamp = new Date().toISOString();
    return this.repository.create({
      id: randomUUID(), workspaceId, taskId, runtimeId: this.runtime.id, status: 'created', plan,
      checkpoint: { nextStepIndex: 0, currentStepId: null, contributions: [] },
      pauseAfterStep: body.pauseAfterStep === true, pendingControl: null, failure: null,
      createdAt: timestamp, startedAt: null, updatedAt: timestamp, finishedAt: null, revision: 0, schemaVersion: 1,
    });
  }

  list(workspaceId: string): Execution[] {
    this.requireWorkspace(workspaceId);
    const rows = this.repository.listForWorkspace(workspaceId);
    if (rows.some((row) => this.storageFaults.has(row.id))) throw new ExecutionError('persistence_unavailable', 'Execution checkpoint could not be saved. Work stopped; restart to inspect the last durable checkpoint.');
    return rows;
  }
  get(workspaceId: string, id: string): Execution {
    this.requireWorkspace(workspaceId);
    if (this.storageFaults.has(id)) throw new ExecutionError('persistence_unavailable', 'Execution checkpoint could not be saved. Work stopped; restart to inspect the last durable checkpoint.');
    const execution = this.repository.getById(id);
    if (!execution || execution.workspaceId !== workspaceId) throw new ExecutionError('not_found', 'Execution was not found in this Workspace.');
    return execution;
  }

  control(workspaceId: string, id: string, action: ExecutionAction): Execution {
    if (this.closing) throw new ExecutionError('runtime_unavailable', 'Runtime is shutting down.');
    const execution = this.get(workspaceId, id);
    if (execution.runtimeId !== this.runtime.id) throw new ExecutionError('runtime_unavailable', 'The recorded execution runtime is unavailable.');
    assertExecutionCheckpoint(execution);
    if (action === 'start' || action === 'resume') {
      if (execution.status !== (action === 'start' ? 'created' : 'paused') || this.active.has(id)) throw new ExecutionError('invalid_transition', `Cannot ${action} this Execution.`);
      if (execution.checkpoint.currentStepId !== null) throw new ExecutionError('invalid_checkpoint', 'An uncertain in-flight step cannot be replayed.');
      const running = this.transition(execution, 'running');
      // Explicit human request starts one bounded attempt, not a scheduler.
      const work = Promise.resolve().then(() => this.drive(id)).catch(() => { this.storageFaults.add(id); }).finally(() => { this.active.delete(id); });
      this.active.set(id, work);
      return running;
    }
    if (action === 'pause') {
      if (execution.status !== 'running' || execution.pendingControl !== null) throw new ExecutionError('invalid_transition', 'Pause requires a running Execution without a pending control.');
      return this.save({ ...execution, pendingControl: 'pause' });
    }
    if (action === 'cancel') {
      if (execution.status === 'running') {
        if (execution.pendingControl === 'cancel') throw new ExecutionError('invalid_transition', 'Cancellation is already requested.');
        return this.save({ ...execution, pendingControl: 'cancel' });
      }
      return this.transition(execution, 'cancelled');
    }
    throw new ExecutionError('invalid_input', 'Unknown Execution control.');
  }

  private async drive(id: string): Promise<void> {
    while (!this.closing) {
      let execution = this.repository.getById(id)!;
      if (execution.status !== 'running') return;
      assertExecutionCheckpoint(execution);
      if (execution.pendingControl) { this.transition(execution, execution.pendingControl === 'cancel' ? 'cancelled' : 'paused'); return; }
      const step = execution.plan.steps[execution.checkpoint.nextStepIndex];
      if (!step) { this.transition(execution, 'completed'); return; }
      // Persist in-flight intent before invoking. Crash recovery must not guess whether
      // an uncheckpointed provider call completed, nor silently replay that call.
      execution = this.save({ ...execution, checkpoint: { ...execution.checkpoint, currentStepId: step.id } });
      let contribution;
      try { contribution = await this.runtime.runNext(execution.plan, execution.checkpoint.contributions); }
      catch (error) {
        const latest = this.repository.getById(id)!;
        const known = error instanceof AgentInvocationError || error instanceof CollaborationValidationError;
        this.transition({ ...latest, failure: { stepId: step.id, agentId: step.agentId, code: known ? error.code : 'runtime_failed', message: known ? error.message : 'Execution step failed safely.' }, checkpoint: { ...latest.checkpoint, currentStepId: null } }, 'failed');
        return;
      }
      // Read fresh control intent after awaiting; never overwrite a concurrent pause/cancel.
      const latest = this.repository.getById(id)!;
      if (latest.status !== 'running') return;
      const checkpoint = { nextStepIndex: latest.checkpoint.nextStepIndex + 1, currentStepId: null, contributions: [...latest.checkpoint.contributions, contribution] };
      const next = { ...latest, checkpoint };
      // Contribution + lifecycle + next-step position are committed atomically.
      if (latest.pendingControl === 'cancel') { this.transition(next, 'cancelled'); return; }
      if (checkpoint.nextStepIndex === latest.plan.steps.length) { this.transition(next, 'completed'); return; }
      if (latest.pendingControl === 'pause' || latest.pauseAfterStep || this.closing) { this.transition(next, 'paused'); return; }
      this.save(next);
    }
  }

  // Called once after the server has successfully bound its port, before accepting work.
  recoverInterrupted(): void {
    for (const execution of this.repository.listRunning(this.runtime.id)) {
      const step = execution.plan.steps[execution.checkpoint.nextStepIndex];
      this.transition({ ...execution, failure: { code: 'runtime_interrupted', message: 'The previous runtime stopped. The last durable checkpoint is retained; an unrecorded in-flight result may be lost. No automatic replay was attempted.', stepId: step?.id ?? 'finished-steps', agentId: step?.agentId ?? execution.plan.steps[0].agentId } }, 'interrupted');
    }
  }

  async waitForIdle(id: string): Promise<void> { await this.active.get(id); }
  async close(): Promise<void> {
    this.closing = true;
    await Promise.all(this.active.values());
    // Any running attempt that had not entered the driver is safely stopped on shutdown.
    this.recoverInterrupted();
  }
  private transition(execution: Execution, status: ExecutionStatus): Execution {
    assertExecutionTransition(execution.status, status);
    const timestamp = new Date().toISOString();
    return this.save({ ...execution, status, pendingControl: null, startedAt: status === 'running' ? execution.startedAt ?? timestamp : execution.startedAt, finishedAt: isTerminalExecution(status) ? timestamp : null });
  }
  private save(execution: Execution): Execution {
    assertExecutionCheckpoint(execution);
    return this.repository.save({ ...execution, updatedAt: new Date().toISOString() });
  }
  private requireWorkspace(id: string): void {
    if (!this.workspaces.getById(id)) throw new ExecutionError('not_found', 'Workspace was not found.');
  }
}
