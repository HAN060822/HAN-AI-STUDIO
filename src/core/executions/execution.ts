import type { AgentContribution, CollaborationFailure, CollaborationPlan } from '../collaboration/collaboration.ts';

export type ExecutionStatus = 'created' | 'running' | 'paused' | 'cancelled' | 'interrupted' | 'failed' | 'completed';
export type ExecutionAction = 'start' | 'pause' | 'resume' | 'cancel';
export type Execution = Readonly<{
  id: string;
  workspaceId: string;
  taskId: string | null;
  runtimeId: string;
  status: ExecutionStatus;
  plan: CollaborationPlan;
  checkpoint: Readonly<{
    nextStepIndex: number;
    currentStepId: string | null;
    contributions: readonly AgentContribution[];
  }>;
  pendingControl: 'pause' | 'cancel' | null;
  pauseAfterStep: boolean;
  failure: CollaborationFailure | null;
  createdAt: string;
  startedAt: string | null;
  updatedAt: string;
  finishedAt: string | null;
  revision: number;
  schemaVersion: number;
}>;

const transitions: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  created: ['running', 'cancelled'],
  running: ['paused', 'cancelled', 'interrupted', 'failed', 'completed'],
  paused: ['running', 'cancelled'],
  cancelled: [], interrupted: [], failed: [], completed: [],
};

export class ExecutionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'ExecutionError'; this.code = code; }
}
export function assertExecutionTransition(from: ExecutionStatus, to: ExecutionStatus): void {
  if (!transitions[from]?.includes(to)) throw new ExecutionError('invalid_transition', `Execution cannot transition from ${from} to ${to}.`);
}
export function isTerminalExecution(status: ExecutionStatus): boolean { return transitions[status].length === 0; }
export function isExecutionAction(value: unknown): value is ExecutionAction { return ['start', 'pause', 'resume', 'cancel'].includes(value as string); }

export function assertExecutionCheckpoint(execution: Execution): void {
  const { checkpoint, plan, status } = execution;
  if (!Number.isInteger(checkpoint.nextStepIndex) || checkpoint.nextStepIndex !== checkpoint.contributions.length || checkpoint.nextStepIndex > plan.steps.length || checkpoint.contributions.some((item, index) => item.stepId !== plan.steps[index]?.id || item.agentId !== plan.steps[index]?.agentId || item.status !== 'succeeded') || (checkpoint.currentStepId !== null && checkpoint.currentStepId !== plan.steps[checkpoint.nextStepIndex]?.id) || (status === 'completed' && checkpoint.nextStepIndex !== plan.steps.length) || (status === 'paused' && checkpoint.currentStepId !== null)) {
    throw new ExecutionError('invalid_checkpoint', 'Execution checkpoint is inconsistent; no work was started.');
  }
}
