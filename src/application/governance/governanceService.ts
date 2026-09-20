import { randomUUID } from 'node:crypto';
import { GovernanceError, safeActor, safeIntent, scopeContains, type Actor, type ActionIntent, type Approval, type AuditCode, type AuditEvent, type PermissionDecision, type PermissionGrant } from '../../core/governance/governance.ts';
import type { GovernanceRepository } from './governanceRepository.ts';

export type ActionResult<T> = { value: T; outcome: 'succeeded' | 'failed'; code: AuditCode };
export class GovernanceService {
  private readonly repository: GovernanceRepository;
  private readonly grants: readonly PermissionGrant[];
  private readonly now: () => Date;
  private readonly issued = new Map<string, { snapshot: string; expiresAt: number }>();
  constructor(repository: GovernanceRepository, grants: readonly PermissionGrant[] = [], now: () => Date = () => new Date()) {
    this.repository = repository; this.grants = structuredClone(grants); this.now = now;
  }
  decide(actor: Actor | null, intent: ActionIntent): PermissionDecision {
    actor = safeActor(actor);
    intent = safeIntent(intent);
    if (!actor) return { status: 'denied', reasonCode: 'no_authority', reason: 'No trusted local actor authority was supplied.', grantId: null };
    const grant = intent.action !== 'PHYSICAL' && this.grants.find((item) => item.actor.type === actor.type && item.actor.id === actor.id && item.action === intent.action && item.resourceType === intent.resource.type && (item.resourceId === '*' || item.resourceId === intent.resource.id) && item.capability === intent.consequence.capability && scopeContains(item.scope, intent.scope));
    if (!grant) return { status: 'denied', reasonCode: 'no_grant', reason: 'No explicit grant permits this actor, action, resource and scope.', grantId: null };
    const approval = grant.requiresApproval || intent.action === 'EXTERNAL' || intent.action === 'DELETE' || intent.resource.type === 'secret';
    return { status: approval ? 'approval_required' : 'allowed', reasonCode: approval ? 'review_required' : 'explicit_grant', reason: approval ? 'HAN must review this exact action and destination and approve this attempt.' : 'An explicit scoped grant permits this internal action.', grantId: grant.id };
  }
  issueApproval(actor: Actor | null, intent: ActionIntent): Approval {
    actor = safeActor(actor);
    intent = safeIntent(intent);
    const decision = this.decide(actor, intent);
    if (actor?.type !== 'human' || decision.status !== 'approval_required' || !decision.grantId) throw new GovernanceError('permission_denied', 'Only an authorized human may approve this action.', decision);
    const current = this.now();
    for (const [id, issued] of this.issued) if (issued.expiresAt <= current.getTime()) this.issued.delete(id);
    const approval: Approval = { id: randomUUID(), actor: { ...actor }, intent: structuredClone(intent), grantId: decision.grantId, createdAt: current.toISOString(), expiresAt: new Date(current.getTime() + 5 * 60_000).toISOString(), schemaVersion: 1 };
    this.issued.set(approval.id, { snapshot: JSON.stringify(approval), expiresAt: Date.parse(approval.expiresAt) });
    return approval;
  }
  run<T>(actor: Actor | null, intent: ActionIntent, explicitlyApproved: boolean, action: () => ActionResult<T>): T {
    const decision = this.decide(actor, intent);
    const approval = explicitlyApproved && actor?.type === 'human' && decision.status === 'approval_required' ? this.issueApproval(actor, intent) : null;
    return this.runWithApproval(actor, intent, approval, action);
  }
  runWithApproval<T>(actor: Actor | null, intent: ActionIntent, approval: Approval | null, action: () => ActionResult<T>): T {
    actor = safeActor(actor);
    intent = safeIntent(intent);
    let decision = this.decide(actor, intent);
    if (approval) {
      const issued = this.issued.get(approval.id);
      this.issued.delete(approval.id); // Single attempted use, including rejection or an audit outage.
      const valid = issued && issued.expiresAt > this.now().getTime() && issued.snapshot === JSON.stringify(approval) && JSON.stringify(approval.intent) === JSON.stringify(intent) && approval.actor.type === actor?.type && approval.actor.id === actor.id && approval.grantId === decision.grantId;
      if (!valid || decision.status !== 'approval_required') decision = { status: 'denied', reasonCode: 'invalid_approval', reason: 'Approval is expired, consumed, forged or belongs to another action, actor, resource or scope.', grantId: null };
      else decision = { ...decision, status: 'allowed', reasonCode: 'approved', reason: 'Explicit scoped permission and one-use human approval authorize this attempt.' };
    }
    const attemptId = randomUUID();
    const event = (outcome: AuditEvent['outcome'], code: AuditCode): AuditEvent => ({ id: randomUUID(), attemptId, timestamp: this.now().toISOString(), actor: actor ? { type: actor.type, id: actor.id } : null, intent: safeIntent(intent), decision, approvalId: decision.status === 'allowed' ? approval?.id ?? null : null, outcome, code, schemaVersion: 1 });
    if (decision.status !== 'allowed') {
      this.append(event('not_executed', decision.reasonCode as AuditCode));
      throw new GovernanceError(decision.status === 'denied' ? 'permission_denied' : 'approval_required', decision.reason, decision);
    }
    try { this.repository.begin(event('started', 'ok'), approval); }
    catch { throw new GovernanceError('audit_unavailable', 'Required approval/audit evidence could not be preserved. The action did not execute.'); }
    let result: ActionResult<T>;
    try { result = action(); }
    catch (error) {
      this.append(event('unconfirmed', 'action_unconfirmed'), true);
      throw error; // Existing domain errors remain normalized by their HTTP boundary; never copied into audit.
    }
    this.append(event(result.outcome, result.code), true);
    return result.value;
  }
  private append(event: AuditEvent, afterAction = false): void {
    try { this.repository.append(event); }
    catch { throw new GovernanceError(afterAction ? 'audit_unconfirmed' : 'audit_unavailable', afterAction ? 'The action may have completed, but its final audit could not be confirmed. Inspect the saved state and note before any retry.' : 'Required audit evidence is unavailable. No action executed.'); }
  }
  history(actor: Actor | null, workspaceId: string, resourceId: string): AuditEvent[] {
    const intent: ActionIntent = { action: 'READ', resource: { type: 'audit', id: resourceId }, scope: { kind: 'workspace', workspaceId }, consequence: { capability: 'audit.read', destinationId: 'local', fingerprint: 'metadata-only' } };
    const decision = this.decide(actor, intent);
    if (decision.status !== 'allowed') throw new GovernanceError('permission_denied', decision.reason, decision);
    return this.repository.list(workspaceId, 'knowledge', resourceId, 20);
  }
}
