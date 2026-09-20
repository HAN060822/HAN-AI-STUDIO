import { randomUUID } from 'node:crypto';
import type { ExecutionRepository } from '../executions/executionRepository.ts';
import type { TaskRepository } from '../tasks/taskRepository.ts';
import type { WorkspaceRepository } from '../workspaces/workspaceRepository.ts';
import { ARTIFACT_SCHEMA_VERSION, isArtifactKind, type Artifact, type CreateArtifactInput } from '../../core/outcomes/artifact.ts';
import { TASK_REPORT_SCHEMA_VERSION, type TaskReport } from '../../core/outcomes/taskReport.ts';
import type { OutcomeRepository } from './outcomeRepository.ts';

export class OutcomeError extends Error {
  readonly code: 'invalid_input' | 'not_found' | 'scope_mismatch' | 'creation_conflict';
  constructor(code: OutcomeError['code'], message: string) { super(message); this.name = 'OutcomeError'; this.code = code; }
}

type OutcomeServiceOptions = { createId?: () => string; now?: () => Date };

export class OutcomeService {
  private readonly outcomes: OutcomeRepository;
  private readonly workspaces: WorkspaceRepository;
  private readonly tasks: TaskRepository;
  private readonly executions: ExecutionRepository;
  private readonly options: OutcomeServiceOptions;
  constructor(
    outcomes: OutcomeRepository,
    workspaces: WorkspaceRepository,
    tasks: TaskRepository,
    executions: ExecutionRepository,
    options: OutcomeServiceOptions = {},
  ) {
    this.outcomes = outcomes;
    this.workspaces = workspaces;
    this.tasks = tasks;
    this.executions = executions;
    this.options = options;
  }

  listArtifacts(workspaceId: string, taskId?: string): Artifact[] {
    this.requireWorkspace(workspaceId);
    if (taskId) this.requireTask(workspaceId, taskId);
    return this.outcomes.listArtifactsForWorkspace(workspaceId, taskId);
  }

  getArtifact(workspaceId: string, artifactId: string): Artifact {
    this.requireWorkspace(workspaceId);
    const artifact = this.outcomes.getArtifactById(artifactId);
    if (!artifact) throw new OutcomeError('not_found', `Artifact ${artifactId} was not found.`);
    if (artifact.workspaceId !== workspaceId) throw new OutcomeError('scope_mismatch', 'This Artifact does not belong to the selected Workspace.');
    return artifact;
  }

  createArtifact(workspaceId: string, input: CreateArtifactInput): Artifact {
    this.requireWorkspace(workspaceId);
    if (input.creationId !== undefined && (typeof input.creationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.creationId))) throw new OutcomeError('invalid_input', 'Artifact creation ID must be a UUID v4.');
    const title = this.requiredText(input.title, 'Artifact title', 180);
    if (!isArtifactKind(input.kind)) throw new OutcomeError('invalid_input', 'Choose document, result, or note as the Artifact kind.');
    let taskId = input.taskId ?? null;
    if (taskId) this.requireTask(workspaceId, taskId);
    const hasSource = input.sourceExecutionId !== undefined || input.sourceContributionStepId !== undefined;
    let content: string;
    let provenance: Artifact['provenance'];
    if (hasSource) {
      if (!input.sourceExecutionId || !input.sourceContributionStepId || input.content !== undefined) throw new OutcomeError('invalid_input', 'A preserved contribution requires both source Execution and step, without separate content.');
      const execution = this.executions.getById(input.sourceExecutionId);
      if (!execution) throw new OutcomeError('not_found', `Execution ${input.sourceExecutionId} was not found.`);
      if (execution.workspaceId !== workspaceId) throw new OutcomeError('scope_mismatch', 'The source Execution does not belong to the selected Workspace.');
      if (taskId && execution.taskId !== taskId) throw new OutcomeError('scope_mismatch', 'The source Execution is not linked to the selected Task.');
      taskId ??= execution.taskId;
      const contribution = execution.checkpoint.contributions.find((item) => item.stepId === input.sourceContributionStepId);
      if (!contribution) throw new OutcomeError('not_found', `Committed contribution ${input.sourceContributionStepId} was not found on the source Execution.`);
      content = this.requiredText(contribution.output, 'Artifact content', 100_000);
      provenance = {
        executionId: execution.id, contributionStepId: contribution.stepId,
        agentId: contribution.agentId, agentDisplayName: contribution.agentDisplayName,
        providerId: contribution.providerId, modelId: contribution.modelId, mode: contribution.mode,
      };
    } else {
      content = this.requiredText(input.content, 'Artifact content', 100_000);
      provenance = { executionId: null, contributionStepId: null, agentId: null, agentDisplayName: null, providerId: null, modelId: null, mode: null };
    }
    const id = input.creationId?.toLowerCase() ?? this.createId();
    const existing = input.creationId ? this.outcomes.getArtifactById(id) : null;
    if (existing) {
      if (existing.workspaceId !== workspaceId || existing.taskId !== taskId || existing.title !== title || existing.kind !== input.kind || existing.content !== content || JSON.stringify(existing.provenance) !== JSON.stringify(provenance)) throw new OutcomeError('creation_conflict', 'Artifact creation ID already belongs to a different preservation request. Reload to inspect saved outcomes.');
      return existing;
    }
    const timestamp = this.now().toISOString();
    return this.outcomes.createArtifact({ id, workspaceId, taskId, title, kind: input.kind, content, provenance, createdAt: timestamp, updatedAt: timestamp, schemaVersion: ARTIFACT_SCHEMA_VERSION });
  }

  listTaskReports(workspaceId: string): TaskReport[] {
    this.requireWorkspace(workspaceId);
    return this.outcomes.listTaskReportsForWorkspace(workspaceId);
  }

  getTaskReport(workspaceId: string, reportId: string): TaskReport {
    this.requireWorkspace(workspaceId);
    const report = this.outcomes.getTaskReportById(reportId);
    if (!report) throw new OutcomeError('not_found', `Task Report ${reportId} was not found.`);
    if (report.workspaceId !== workspaceId) throw new OutcomeError('scope_mismatch', 'This Task Report does not belong to the selected Workspace.');
    return report;
  }

  generateTaskReport(workspaceId: string, taskId: string): TaskReport {
    this.requireWorkspace(workspaceId);
    const task = this.requireTask(workspaceId, taskId);
    const executions = this.executions.listForWorkspace(workspaceId).filter((execution) => execution.taskId === taskId);
    const artifacts = this.outcomes.listArtifactsForWorkspace(workspaceId, taskId);
    const existing = this.outcomes.getTaskReportByTaskId(taskId);
    const timestamp = this.now().toISOString();
    const agents = new Map<string, string>();
    for (const execution of executions) for (const step of execution.plan.steps) {
      const contribution = execution.checkpoint.contributions.find((item) => item.agentId === step.agentId);
      agents.set(step.agentId, contribution?.agentDisplayName ?? step.agentId);
    }
    const statusCounts = executions.reduce<Record<string, number>>((counts, execution) => ({ ...counts, [execution.status]: (counts[execution.status] ?? 0) + 1 }), {});
    const statusText = Object.entries(statusCounts).map(([status, count]) => `${count} ${status}`).join(', ') || 'none';
    const limitations = executions.flatMap((execution) => execution.failure ? [`Execution ${execution.id} stopped at ${execution.failure.stepId} (${execution.failure.agentId}): ${execution.failure.message}`] : []);
    const report: TaskReport = {
      id: existing?.id ?? this.createId(), workspaceId,
      task: { id: task.id, title: task.title, goal: task.goal, status: task.status, createdAt: task.createdAt, updatedAt: task.updatedAt, completedAt: task.completedAt },
      outcomeSummary: `Task “${task.title}” is ${task.status}. Related Executions: ${executions.length} (${statusText}). Preserved Artifacts: ${artifacts.length}.`,
      executions: executions.map((execution) => ({
        id: execution.id, status: execution.status, goal: execution.plan.goal, runtimeId: execution.runtimeId,
        participantAgentIds: execution.plan.steps.map((step) => step.agentId), contributionCount: execution.checkpoint.contributions.length,
        finalContributionStepId: execution.status === 'completed' ? execution.checkpoint.contributions.at(-1)?.stepId ?? null : null,
        failure: execution.failure ? { ...execution.failure } : null, createdAt: execution.createdAt, finishedAt: execution.finishedAt,
      })),
      participatingAgents: [...agents].map(([agentId, displayName]) => ({ agentId, displayName })),
      artifacts: artifacts.map((artifact) => ({ id: artifact.id, title: artifact.title, kind: artifact.kind, sourceExecutionId: artifact.provenance.executionId, contributionStepId: artifact.provenance.contributionStepId })),
      limitations,
      createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp, schemaVersion: TASK_REPORT_SCHEMA_VERSION,
    };
    return this.outcomes.saveTaskReport(report);
  }

  private requireWorkspace(workspaceId: string) {
    const workspace = this.workspaces.getById(workspaceId);
    if (!workspace) throw new OutcomeError('not_found', `Workspace ${workspaceId} was not found.`);
    return workspace;
  }
  private requireTask(workspaceId: string, taskId: string) {
    const task = this.tasks.getById(taskId);
    if (!task) throw new OutcomeError('not_found', `Task ${taskId} was not found.`);
    if (task.workspaceId !== workspaceId) throw new OutcomeError('scope_mismatch', 'The selected Task does not belong to this Workspace.');
    return task;
  }
  private requiredText(value: unknown, label: string, maximum: number): string {
    if (typeof value !== 'string' || !value.trim()) throw new OutcomeError('invalid_input', `${label} is required.`);
    const normalized = value.trim();
    if (normalized.length > maximum) throw new OutcomeError('invalid_input', `${label} must be ${maximum.toLocaleString('en-US')} characters or fewer.`);
    return normalized;
  }
  private createId(): string { return (this.options.createId ?? randomUUID)(); }
  private now(): Date { return (this.options.now ?? (() => new Date()))(); }
}
