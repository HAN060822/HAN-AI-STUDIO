import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GovernanceService } from '../src/application/governance/governanceService.ts';
import { prototypeGrants } from '../src/application/governance/prototypePolicy.ts';
import { KnowledgeService } from '../src/application/knowledge/knowledgeService.ts';
import { LOCAL_HAN, type Actor, type ActionIntent, type PermissionGrant } from '../src/core/governance/governance.ts';
import { knowledgeFixture, manualKnowledge } from './knowledgeFixtures.ts';

const fixtures: ReturnType<typeof knowledgeFixture>[] = [];
function fixture() {
  const f = knowledgeFixture(); fixtures.push(f);
  const record = f.knowledge.create('workspace-a', manualKnowledge); const preview = f.knowledge.preview('workspace-a', record.id);
  const intent: ActionIntent = { action: 'EXTERNAL', resource: { type: 'knowledge', id: record.id }, scope: { kind: 'workspace', workspaceId: 'workspace-a' }, consequence: { capability: 'obsidian-markdown.publish', destinationId: preview.destinationId, fingerprint: preview.token } };
  return { ...f, record, preview, intent, body: { approved: true, previewToken: preview.token } };
}
afterEach(async () => { vi.restoreAllMocks(); for (const f of fixtures.splice(0)) await f.closeKnowledge(); });

describe('Scoped governance and consequential action enforcement', () => {
  it.each([null, { type: 'agent', id: 'agent-gpt' }, { type: 'system', id: 'prototype-local' }, { type: 'human', id: 'unknown' }] as (Actor | null)[])('denies absent or ungranted actor %#, audits denial, and leaves source/state/vault untouched', (actor) => {
    const f = fixture(); const publish = vi.spyOn(f.connector, 'publish');
    expect(() => f.knowledge.save(actor, 'workspace-a', f.record.id, f.body)).toThrow(/authority|grant/);
    expect(publish).not.toHaveBeenCalled(); expect(existsSync(join(f.vault, 'Knowledge'))).toBe(false);
    expect(f.knowledge.get('workspace-a', f.record.id)).toEqual(f.record);
    expect(f.governanceRepository.list('workspace-a', 'knowledge', f.record.id)[0]).toMatchObject({ actor, decision: { status: 'denied' }, outcome: 'not_executed', approvalId: null });
  });
  it('requires explicit approval even with a grant; never treats connection or a preview token as authority', () => {
    const f = fixture();
    expect(f.governance.decide(LOCAL_HAN, f.intent).status).toBe('approval_required');
    expect(() => f.knowledge.save(LOCAL_HAN, 'workspace-a', f.record.id, { ...f.body, approved: false })).toThrow(/must review/);
    expect(existsSync(join(f.vault, 'Knowledge'))).toBe(false);
    expect(f.governanceRepository.list('workspace-a', 'knowledge', f.record.id)[0]).toMatchObject({ decision: { status: 'approval_required' }, outcome: 'not_executed' });
  });
  it('bounds audit references and strips unrecognized payload properties from actors, intents and approvals', () => {
    const f = fixture(); const privateText = 'DUMMY private payload that must not be persisted';
    const actor = { ...LOCAL_HAN, credential: privateText };
    const intent = { ...f.intent, content: privateText, consequence: { ...f.intent.consequence, prompt: privateText } };
    f.governance.run(actor, intent, true, () => ({ value: null, outcome: 'succeeded', code: 'ok' }));
    const events = f.governanceRepository.list('workspace-a', 'knowledge', f.record.id);
    expect(JSON.stringify(events)).not.toContain(privateText); expect(JSON.stringify(f.governanceRepository.getApproval(events[0].approvalId!))).not.toContain(privateText);
    expect(() => f.governance.run(LOCAL_HAN, { ...f.intent, resource: { type: 'knowledge', id: 'x'.repeat(181) } }, true, () => { throw new Error('must not execute'); })).toThrow(/bounded/);
  });
  it('publishes through the existing safe connector only after durable approval/audit, with attributable final audit', () => {
    const f = fixture(); const publish = f.connector.publish.bind(f.connector);
    vi.spyOn(f.connector, 'publish').mockImplementation((record) => {
      const started = f.governanceRepository.list('workspace-a', 'knowledge', record.id)[0];
      expect(started.outcome).toBe('started'); expect(started.approvalId).not.toBeNull();
      expect(f.governanceRepository.getApproval(started.approvalId!)?.consumedAt).toBe(started.timestamp);
      return publish(record);
    });
    expect(f.knowledge.save(LOCAL_HAN, 'workspace-a', f.record.id, f.body).status).toBe('saved');
    const events = f.governanceRepository.list('workspace-a', 'knowledge', f.record.id);
    expect(events.map((event) => event.outcome)).toEqual(['succeeded', 'started']);
    expect(events[0]).toMatchObject({ actor: LOCAL_HAN, intent: f.intent, decision: { status: 'allowed' }, code: 'ok' });
    expect(events[0].attemptId).toBe(events[1].attemptId); expect(events[0].approvalId).toBe(events[1].approvalId);
  });
  it.each(['resource', 'action', 'workspace', 'destination', 'fingerprint', 'actor'])('rejects approval reused for another %s', (change) => {
    const f = fixture(); const approval = f.governance.issueApproval(LOCAL_HAN, f.intent);
    const intent = structuredClone(f.intent) as { -readonly [K in keyof ActionIntent]: ActionIntent[K] };
    let actor = LOCAL_HAN;
    if (change === 'resource') intent.resource = { ...intent.resource, id: 'another-record' };
    if (change === 'action') intent.action = 'DELETE';
    if (change === 'workspace') intent.scope = { kind: 'workspace', workspaceId: 'workspace-b' };
    if (change === 'destination') intent.consequence = { ...intent.consequence, destinationId: 'another-vault' };
    if (change === 'fingerprint') intent.consequence = { ...intent.consequence, fingerprint: 'changed-content' };
    if (change === 'actor') actor = { type: 'agent', id: 'agent-gpt' };
    const action = vi.fn(() => ({ value: true, outcome: 'succeeded' as const, code: 'ok' as const }));
    expect(() => f.governance.runWithApproval(actor, intent, approval, action)).toThrow(/Approval/); expect(action).not.toHaveBeenCalled();
  });
  it('rejects forged, modified, expired and consumed approvals and does not re-enable them after restart', () => {
    const f = fixture(); let now = new Date('2026-09-20T00:00:00Z');
    const service = new GovernanceService(f.governanceRepository, prototypeGrants('review'), () => now);
    const action = vi.fn(() => ({ value: 1, outcome: 'succeeded' as const, code: 'ok' as const }));
    const forged = { ...service.issueApproval(LOCAL_HAN, f.intent), id: 'forged' };
    expect(() => service.runWithApproval(LOCAL_HAN, f.intent, forged, action)).toThrow(/Approval/);
    const modified = service.issueApproval(LOCAL_HAN, f.intent); (modified as { grantId: string }).grantId = 'forged-grant';
    expect(() => service.runWithApproval(LOCAL_HAN, f.intent, modified, action)).toThrow(/Approval/);
    const expired = service.issueApproval(LOCAL_HAN, f.intent); now = new Date(now.getTime() + 300_001);
    expect(() => service.runWithApproval(LOCAL_HAN, f.intent, expired, action)).toThrow(/Approval/);
    const current = service.issueApproval(LOCAL_HAN, f.intent); expect(service.runWithApproval(LOCAL_HAN, f.intent, current, action)).toBe(1);
    expect(() => service.runWithApproval(LOCAL_HAN, f.intent, current, action)).toThrow(/Approval/);
    const restarted = new GovernanceService(f.governanceRepository, prototypeGrants('review'), () => now);
    expect(() => restarted.runWithApproval(LOCAL_HAN, f.intent, current, action)).toThrow(/Approval/); expect(action).toHaveBeenCalledTimes(1);
  });
  it('limits Workspace and Task/Execution grants, defaults to deny, and permits a specific lower-risk internal action', () => {
    const f = fixture(); const intent: ActionIntent = { ...f.intent, action: 'READ', resource: { type: 'artifact', id: 'artifact-a' }, scope: { kind: 'task', workspaceId: 'workspace-a', taskId: 'task-a' }, consequence: { ...f.intent.consequence, capability: 'artifact.read' } };
    const grant: PermissionGrant = { id: 'task-read', actor: LOCAL_HAN, action: 'READ', resourceType: 'artifact', resourceId: 'artifact-a', scope: intent.scope, capability: 'artifact.read', requiresApproval: false };
    const service = new GovernanceService(f.governanceRepository, [grant]);
    expect(new GovernanceService(f.governanceRepository).decide(LOCAL_HAN, intent).status).toBe('denied');
    expect(service.decide(LOCAL_HAN, intent).status).toBe('allowed');
    for (const scope of [{ kind: 'task', workspaceId: 'workspace-b', taskId: 'task-a' }, { kind: 'task', workspaceId: 'workspace-a', taskId: 'task-b' }, { kind: 'execution', workspaceId: 'workspace-a', executionId: 'execution-a' }, { kind: 'global' }] as ActionIntent['scope'][]) expect(service.decide(LOCAL_HAN, { ...intent, scope }).status).toBe('denied');
    expect(service.run(LOCAL_HAN, intent, false, () => ({ value: 'internal result', outcome: 'succeeded', code: 'ok' }))).toBe('internal result');
  });
  it('blocks a once-permitted action when the configured policy is revoked', () => {
    const f = fixture(); const approval = f.governance.issueApproval(LOCAL_HAN, f.intent);
    const revoked = new GovernanceService(f.governanceRepository, prototypeGrants('deny'));
    expect(() => revoked.runWithApproval(LOCAL_HAN, f.intent, approval, () => { throw new Error('must not run'); })).toThrow(/Approval/);
    const service = new KnowledgeService(f.knowledgeRepository, f.workspaces, f.outcomeRepository, f.connector, revoked);
    expect(service.review(LOCAL_HAN, 'workspace-a', f.record.id).decision.status).toBe('denied');
    expect(() => service.save(LOCAL_HAN, 'workspace-a', f.record.id, f.body)).toThrow(/grant/); expect(existsSync(join(f.vault, 'Knowledge'))).toBe(false);
  });
  it('fails closed if pre-action audit fails and does not consume an approval without its audit', () => {
    const f = fixture(); const original = f.governanceRepository.append.bind(f.governanceRepository);
    let approvalId: string | null = null;
    vi.spyOn(f.governanceRepository, 'append').mockImplementation((event) => { if (event.outcome === 'started') { approvalId = event.approvalId; throw new Error('disk unavailable'); } original(event); });
    expect(() => f.knowledge.save(LOCAL_HAN, 'workspace-a', f.record.id, f.body)).toThrow(/did not execute/);
    expect(f.governanceRepository.getApproval(approvalId!)).toBeNull(); expect(existsSync(join(f.vault, 'Knowledge'))).toBe(false);
    expect(f.knowledge.get('workspace-a', f.record.id)).toEqual(f.record);
  });
  it('truthfully retains success state but reports unconfirmed audit when post-action audit fails', () => {
    const f = fixture(); const original = f.governanceRepository.append.bind(f.governanceRepository);
    vi.spyOn(f.governanceRepository, 'append').mockImplementation((event) => { if (event.outcome === 'succeeded') throw new Error('audit full'); original(event); });
    expect(() => f.knowledge.save(LOCAL_HAN, 'workspace-a', f.record.id, f.body)).toThrow(/action may have completed/);
    expect(f.knowledge.get('workspace-a', f.record.id).status).toBe('saved');
    expect(f.governanceRepository.list('workspace-a', 'knowledge', f.record.id).map((event) => event.outcome)).toEqual(['started']);
    expect(readdirSync(join(f.vault, 'Knowledge', 'AI-Studio-Generated'))).toHaveLength(1);
  });
  it('records connector failure without raw exception content and uses a new approval for explicit retry', () => {
    const f = fixture(); vi.spyOn(f.connector, 'publish').mockImplementationOnce(() => { throw new Error('private filesystem details'); });
    expect(f.knowledge.save(LOCAL_HAN, 'workspace-a', f.record.id, f.body).status).toBe('failed');
    const failed = f.governanceRepository.list('workspace-a', 'knowledge', f.record.id)[0];
    expect(failed).toMatchObject({ outcome: 'failed', code: 'connector_failed' }); expect(JSON.stringify(failed)).not.toContain('private filesystem');
    expect(f.knowledge.save(LOCAL_HAN, 'workspace-a', f.record.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', f.record.id).token }).status).toBe('saved');
    expect(f.governanceRepository.list('workspace-a', 'knowledge', f.record.id)[0].approvalId).not.toBe(failed.approvalId);
  });
});
