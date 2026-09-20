export type Actor = Readonly<{ type: 'human' | 'agent' | 'system'; id: string }>;
export const LOCAL_HAN: Actor = Object.freeze({ type: 'human', id: 'han-local' });
export type Action = 'READ' | 'WRITE' | 'CREATE' | 'MODIFY' | 'EXECUTE' | 'DELETE' | 'EXTERNAL' | 'PHYSICAL';
export type ResourceType = 'workspace' | 'task' | 'execution' | 'artifact' | 'knowledge' | 'connector' | 'provider' | 'filesystem' | 'secret' | 'audit';
export type Scope = Readonly<{ kind: 'global' }> | Readonly<{ kind: 'workspace'; workspaceId: string }> |
  Readonly<{ kind: 'task'; workspaceId: string; taskId: string }> | Readonly<{ kind: 'execution'; workspaceId: string; executionId: string }>;
export type ActionIntent = Readonly<{
  action: Action;
  resource: Readonly<{ type: ResourceType; id: string }>;
  scope: Scope;
  // References/fingerprints only, never content, absolute paths, credentials or raw payloads.
  consequence: Readonly<{ capability: string; destinationId: string; fingerprint: string }>;
}>;
export type PermissionGrant = Readonly<{
  id: string; actor: Actor; action: Action; resourceType: ResourceType; resourceId: string | '*';
  scope: Scope; capability: string; requiresApproval: boolean;
}>;
export type PermissionDecision = Readonly<{
  status: 'allowed' | 'denied' | 'approval_required';
  reasonCode: 'explicit_grant' | 'approved' | 'no_authority' | 'no_grant' | 'review_required' | 'invalid_approval';
  reason: string; grantId: string | null;
}>;
export type Approval = Readonly<{
  id: string; actor: Actor; intent: ActionIntent; grantId: string;
  createdAt: string; expiresAt: string; schemaVersion: number;
}>;
export type AuditOutcome = 'not_executed' | 'started' | 'succeeded' | 'failed' | 'unconfirmed';
export type AuditCode = 'ok' | 'already_saved_verified' | 'no_authority' | 'no_grant' | 'review_required' | 'invalid_approval' | 'connector_failed' | 'secret_unavailable' | 'secret_use_failed' | 'action_unconfirmed';
export type AuditEvent = Readonly<{
  id: string; attemptId: string; timestamp: string; actor: Actor | null; intent: ActionIntent;
  decision: PermissionDecision; approvalId: string | null; outcome: AuditOutcome; code: AuditCode; schemaVersion: number;
}>;
export class GovernanceError extends Error {
  readonly code: string;
  readonly decision?: PermissionDecision;
  constructor(code: string, message: string, decision?: PermissionDecision) { super(message); this.name = 'GovernanceError'; this.code = code; this.decision = decision; }
}
export function scopeContains(grant: Scope, target: Scope): boolean {
  if (grant.kind === 'global') return true; // Only an explicitly configured global grant spans Workspaces.
  if (target.kind === 'global' || target.workspaceId !== grant.workspaceId) return false;
  if (grant.kind === 'workspace') return true;
  return grant.kind === target.kind && (grant.kind === 'task' ? grant.taskId === (target as Extract<Scope, {kind: 'task'}>).taskId : grant.executionId === (target as Extract<Scope, {kind: 'execution'}>).executionId);
}

// Explicit metadata allowlist: callers cannot smuggle content/credentials as extra audit fields.
export function safeIntent(intent: ActionIntent): ActionIntent {
  const ref = (value: string) => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{1,180}$/.test(value)) throw new GovernanceError('invalid_intent', 'Governance requires bounded reference identifiers, not content or paths.');
    return value;
  };
  const source = intent.scope;
  let scope: Scope;
  if (source.kind === 'global') scope = { kind: 'global' };
  else if (source.kind === 'workspace') scope = { kind: source.kind, workspaceId: ref(source.workspaceId) };
  else if (source.kind === 'task') scope = { kind: source.kind, workspaceId: ref(source.workspaceId), taskId: ref(source.taskId) };
  else if (source.kind === 'execution') scope = { kind: source.kind, workspaceId: ref(source.workspaceId), executionId: ref(source.executionId) };
  else throw new GovernanceError('invalid_intent', 'Unknown governance scope.');
  if (!['READ', 'WRITE', 'CREATE', 'MODIFY', 'EXECUTE', 'DELETE', 'EXTERNAL', 'PHYSICAL'].includes(intent.action) || !['workspace', 'task', 'execution', 'artifact', 'knowledge', 'connector', 'provider', 'filesystem', 'secret', 'audit'].includes(intent.resource.type)) throw new GovernanceError('invalid_intent', 'Unknown governance action or resource.');
  return { action: intent.action, resource: { type: intent.resource.type, id: ref(intent.resource.id) }, scope, consequence: { capability: ref(intent.consequence.capability), destinationId: ref(intent.consequence.destinationId), fingerprint: ref(intent.consequence.fingerprint) } };
}
export function safeActor(actor: Actor | null): Actor | null {
  if (!actor) return null;
  if (!['human', 'agent', 'system'].includes(actor.type) || typeof actor.id !== 'string' || !/^[A-Za-z0-9._:-]{1,180}$/.test(actor.id)) throw new GovernanceError('invalid_intent', 'Governance requires a bounded actor reference.');
  return { type: actor.type, id: actor.id };
}
