import { AgentInvocationError, type AgentInvocationService, type AgentInvocationResult } from '../agents/agentInvocationService.ts';
import { CollaborationValidationError, MAX_HANDOFF_CONTRIBUTION, validateCollaborationRequest, type AgentContribution, type AgentHandoff, type CollaborationPlan, type CollaborationResult, type CollaborationStep } from '../../core/collaboration/collaboration.ts';
import { DeterministicCollaborationPlanner, validateCollaborationPlan, type CollaborationPlanner } from './collaborationPlanner.ts';
import { collaborationContext } from '../context/contextAssembler.ts';
import type { ExecutionContextScope } from '../../core/context/context.ts';

export type AgentInvoker = Pick<AgentInvocationService, 'assertInvokable' | 'invoke'>;

function validateContribution(value: AgentInvocationResult, step: CollaborationStep): void {
  if (!value || value.agentId !== step.agentId || value.status !== 'succeeded' || !['mock', 'real'].includes(value.mode) || [value.output, value.agentDisplayName, value.providerId, value.modelId].some((field) => typeof field !== 'string' || !field.trim())) {
    throw new AgentInvocationError('malformed_contribution', 'Agent returned an invalid contribution.');
  }
}

export class OrchestratorService {
  private readonly invocation: AgentInvoker;
  private readonly planner: CollaborationPlanner;
  constructor(invocation: AgentInvoker, planner: CollaborationPlanner = new DeterministicCollaborationPlanner()) {
    this.invocation = invocation; this.planner = planner;
  }

  createPlan(input: unknown): CollaborationPlan {
    const request = validateCollaborationRequest(input);
    const plan = this.planner.plan(request);
    validateCollaborationPlan(plan, request);
    // Copy the description before awaiting adapters; planning is not a mutable runtime.
    return { ...plan, steps: plan.steps.map((step) => ({ ...step })) };
  }

  // One existing collaboration step, exposed for a runtime to checkpoint between calls.
  // No lifecycle, persistence, transport, or provider implementation enters this service.
  async contributeNext(plan: CollaborationPlan, completed: readonly AgentContribution[], scope?: ExecutionContextScope): Promise<AgentContribution> {
    const request = validateCollaborationRequest({ goal: plan.goal, collaborationMode: plan.mode, participantAgentIds: plan.steps.map((step) => step.agentId) });
    validateCollaborationPlan(plan, request);
    const step = plan.steps[completed.length];
    if (!step || completed.some((item, index) => item.stepId !== plan.steps[index].id || item.agentId !== plan.steps[index].agentId)) throw new CollaborationValidationError('invalid_plan', 'Completed contributions do not match the remaining plan.');
    const previous = completed.at(-1);
    const handoff: AgentHandoff | null = previous ? {
      sourceAgentId: previous.agentId, targetAgentId: step.agentId, originalGoal: plan.goal,
      relevantContribution: previous.output.slice(0, MAX_HANDOFF_CONTRIBUTION),
      contributionTruncated: previous.output.length > MAX_HANDOFF_CONTRIBUTION,
      requestedNextAction: plan.mode === 'review'
        ? 'Review and challenge the prior contribution against the original goal. Identify issues and give your review conclusion.'
        : 'Continue from the prior contribution toward the original goal. Give your resulting contribution.',
    } : null;
    const context = collaborationContext(plan, step, handoff, previous, scope);
    const result = await this.invocation.invoke(step.agentId, context.input, context);
    validateContribution(result, step);
    return { ...result, stepId: step.id, handoff };
  }

  async collaborate(input: unknown): Promise<CollaborationResult> {
    const snapshot = this.createPlan(input);
    const contributions: AgentContribution[] = [];
    let currentStep = snapshot.steps[0];
    try {
      // Reject non-invokable participants before any partial provider work.
      for (const step of snapshot.steps) {
        currentStep = step;
        this.invocation.assertInvokable(step.agentId);
      }
      for (const step of snapshot.steps) {
        currentStep = step;
        contributions.push(await this.contributeNext(snapshot, contributions));
      }
      // Structural convergence only: every required step succeeded and the last exists.
      return { status: 'succeeded', mode: snapshot.mode, goal: snapshot.goal, plan: snapshot, contributions, finalContribution: contributions[contributions.length - 1], failure: null };
    } catch (error) {
      const known = error instanceof AgentInvocationError;
      return {
        status: 'failed', mode: snapshot.mode, goal: snapshot.goal, plan: snapshot, contributions, finalContribution: null,
        failure: { stepId: currentStep.id, agentId: currentStep.agentId, code: known ? error.code : 'collaboration_failed', message: known ? error.message : 'Collaboration failed safely.' },
      };
    }
  }
}
