import { CollaborationValidationError, type CollaborationPlan, type CollaborationRequest } from '../../core/collaboration/collaboration.ts';

// Future intelligence-assisted planning must return the same bounded description.
// It cannot expand participants, authority, or runtime semantics.
export interface CollaborationPlanner {
  plan(request: CollaborationRequest): CollaborationPlan;
}

export class DeterministicCollaborationPlanner implements CollaborationPlanner {
  plan(request: CollaborationRequest): CollaborationPlan {
    return {
      mode: request.collaborationMode,
      goal: request.goal,
      steps: request.participantAgentIds.map((agentId, index) => ({ id: `step-${index + 1}`, agentId })),
    };
  }
}

export function validateCollaborationPlan(plan: CollaborationPlan, request: CollaborationRequest): void {
  if (!plan || plan.mode !== request.collaborationMode || plan.goal !== request.goal || !Array.isArray(plan.steps) || plan.steps.length !== request.participantAgentIds.length || plan.steps.some((step, index) => !step || step.id !== `step-${index + 1}` || step.agentId !== request.participantAgentIds[index])) {
    throw new CollaborationValidationError('invalid_plan', 'Plan must contain exactly the selected Agents in order, with stable step IDs and the original goal and mode.');
  }
}
