import type { AgentContribution, CollaborationPlan } from '../../core/collaboration/collaboration.ts';
import type { OrchestratorService } from '../collaboration/orchestratorService.ts';
import type { ExecutionRuntime } from './executionRuntime.ts';

export class LocalExecutionRuntime implements ExecutionRuntime {
  readonly id = 'prototype-local';
  private readonly orchestrator: OrchestratorService;
  constructor(orchestrator: OrchestratorService) { this.orchestrator = orchestrator; }
  prepare(input: unknown): CollaborationPlan { return this.orchestrator.createPlan(input); }
  runNext(plan: CollaborationPlan, completed: readonly AgentContribution[]): Promise<AgentContribution> {
    return this.orchestrator.contributeNext(plan, completed);
  }
}
