import type { AgentContribution, CollaborationPlan } from '../../core/collaboration/collaboration.ts';

// Location-neutral capability seam, not a distributed runtime framework.
export interface ExecutionRuntime {
  readonly id: string;
  prepare(input: unknown): CollaborationPlan;
  runNext(plan: CollaborationPlan, completed: readonly AgentContribution[]): Promise<AgentContribution>;
}
