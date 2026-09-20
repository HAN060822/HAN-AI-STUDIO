import type { AgentContribution, CollaborationPlan } from '../../core/collaboration/collaboration.ts';
import type { ExecutionContextScope } from '../../core/context/context.ts';

// Location-neutral capability seam, not a distributed runtime framework.
export interface ExecutionRuntime {
  readonly id: string;
  prepare(input: unknown): CollaborationPlan;
  runNext(plan: CollaborationPlan, completed: readonly AgentContribution[], scope?: ExecutionContextScope): Promise<AgentContribution>;
}
