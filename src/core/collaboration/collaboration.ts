import type { AgentId } from '../agents/agent.ts';

export type CollaborationMode = 'sequential' | 'review';
export type CollaborationRequest = Readonly<{
  goal: string;
  participantAgentIds: readonly AgentId[];
  collaborationMode: CollaborationMode;
}>;
export type CollaborationStep = Readonly<{ id: string; agentId: AgentId }>;
// An ordered coordination description, not a persistent Workflow or Execution.
export type CollaborationPlan = Readonly<{
  mode: CollaborationMode;
  goal: string;
  steps: readonly CollaborationStep[];
}>;
export type AgentHandoff = Readonly<{
  sourceAgentId: AgentId;
  targetAgentId: AgentId;
  originalGoal: string;
  relevantContribution: string;
  contributionTruncated: boolean;
  requestedNextAction: string;
}>;
export type AgentContribution = Readonly<{
  agentId: AgentId;
  agentDisplayName: string;
  stepId: string;
  output: string;
  providerId: string;
  modelId: string;
  mode: 'mock' | 'real';
  status: 'succeeded';
  handoff: AgentHandoff | null;
}>;
export type CollaborationFailure = Readonly<{
  code: string;
  message: string;
  stepId: string;
  agentId: AgentId;
}>;
type ResultBase = Readonly<{
  mode: CollaborationMode;
  goal: string;
  plan: CollaborationPlan;
  contributions: readonly AgentContribution[];
}>;
export type CollaborationResult = ResultBase & (
  | Readonly<{ status: 'succeeded'; finalContribution: AgentContribution; failure: null }>
  | Readonly<{ status: 'failed'; finalContribution: null; failure: CollaborationFailure }>
);

export const MAX_COLLABORATION_GOAL = 500;
export const MAX_HANDOFF_CONTRIBUTION = 800;
export const MAX_COLLABORATION_PARTICIPANTS = 3;

export class CollaborationValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message); this.name = 'CollaborationValidationError'; this.code = code;
  }
}

export function validateCollaborationRequest(value: unknown): CollaborationRequest {
  if (!value || typeof value !== 'object') throw new CollaborationValidationError('invalid_request', 'A collaboration request is required.');
  const request = value as Partial<CollaborationRequest>;
  if (request.collaborationMode !== 'sequential' && request.collaborationMode !== 'review') throw new CollaborationValidationError('invalid_mode', 'Choose Sequential or Review / Challenge.');
  if (typeof request.goal !== 'string' || !request.goal.trim() || request.goal.trim().length > MAX_COLLABORATION_GOAL) throw new CollaborationValidationError('invalid_goal', 'Goal must contain between 1 and 500 characters.');
  const ids = request.participantAgentIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_COLLABORATION_PARTICIPANTS || ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new CollaborationValidationError('invalid_participants', 'Select one to three distinct Agent IDs in order.');
  if (request.collaborationMode === 'review' && ids.length !== 2) throw new CollaborationValidationError('invalid_participants', 'Review / Challenge requires a primary Agent and one distinct reviewer.');
  // Runtime identity/availability validation belongs to the invocation boundary.
  return { goal: request.goal.trim(), participantAgentIds: [...ids], collaborationMode: request.collaborationMode };
}
