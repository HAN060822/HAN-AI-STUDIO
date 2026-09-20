import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnvironmentSecretProvider } from '../src/storage/secrets/environmentSecretProvider.ts';
import { SecretService } from '../src/application/secrets/secretService.ts';
import { GovernanceService } from '../src/application/governance/governanceService.ts';
import { LOCAL_HAN, type PermissionGrant } from '../src/core/governance/governance.ts';
import { knowledgeFixture } from './knowledgeFixtures.ts';

const fixtures: ReturnType<typeof knowledgeFixture>[] = [];
function fixture() { const f = knowledgeFixture(); fixtures.push(f); return f; }
afterEach(async () => { vi.restoreAllMocks(); for (const f of fixtures.splice(0)) await f.closeKnowledge(); });
const dummy = 'DUMMY-ONLY-stage11-credential-not-a-real-key';
const grant: PermissionGrant = { id: 'test-only-secret-use', actor: LOCAL_HAN, action: 'EXECUTE', resourceType: 'secret', resourceId: 'provider.openai', scope: { kind: 'workspace', workspaceId: 'workspace-a' }, capability: 'secret.use', requiresApproval: true };

describe('Server-only Secret references (dummy values only)', () => {
  it('resolves an allowlisted reference only in the trusted server callback; status exposes presence, not values or arbitrary env names', () => {
    const provider = new EnvironmentSecretProvider({ HAN_AI_STUDIO_SECRET_OPENAI: dummy, UNRELATED_ENV: 'never-resolve-this' });
    let observed = false;
    const result = provider.use('provider.openai', (value) => { observed = value === dummy; });
    expect(result).toBeUndefined(); expect(observed).toBe(true);
    expect(provider.status()).toContainEqual({ ref: 'provider.openai', status: 'configured' });
    expect(JSON.stringify(provider)).not.toContain(dummy); expect(JSON.stringify(provider.status())).not.toContain(dummy);
    expect(() => provider.use('UNRELATED_ENV' as 'provider.openai', () => { throw new Error('must not run'); })).toThrow(/unavailable/);
  });
  it('does not resolve or invoke when authority is absent, ungranted or missing approval', () => {
    const f = fixture(); const provider = new EnvironmentSecretProvider({ HAN_AI_STUDIO_SECRET_OPENAI: dummy }); const resolve = vi.spyOn(provider, 'use');
    const consumer = vi.fn(); const secrets = new SecretService(provider, new GovernanceService(f.governanceRepository, [grant]));
    expect(() => secrets.use(null, 'provider.openai', grant.scope, true, consumer)).toThrow(/authority/);
    expect(() => secrets.use({ type: 'agent', id: 'agent-gpt' }, 'provider.openai', grant.scope, true, consumer)).toThrow(/grant/);
    expect(() => secrets.use(LOCAL_HAN, 'provider.openai', grant.scope, false, consumer)).toThrow(/must review/);
    expect(() => new SecretService(provider, f.governance).use(LOCAL_HAN, 'provider.openai', grant.scope, true, consumer)).toThrow(/grant/);
    expect(resolve).not.toHaveBeenCalled(); expect(consumer).not.toHaveBeenCalled();
  });
  it('records truthful success without copying a resolved credential into audit or logging', () => {
    const f = fixture(); const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'info')];
    const service = new SecretService(new EnvironmentSecretProvider({ HAN_AI_STUDIO_SECRET_OPENAI: dummy }), new GovernanceService(f.governanceRepository, [grant]));
    let used = false; service.use(LOCAL_HAN, 'provider.openai', grant.scope, true, (value) => { used = value === dummy; });
    expect(used).toBe(true);
    const audit = f.governanceRepository.list('workspace-a', 'secret', 'provider.openai');
    expect(audit[0]).toMatchObject({ actor: LOCAL_HAN, intent: { action: 'EXECUTE', resource: { type: 'secret', id: 'provider.openai' } }, outcome: 'succeeded' });
    expect(JSON.stringify(audit)).not.toContain(dummy); for (const log of logs) expect(log).not.toHaveBeenCalled();
  });
  it.each(['missing', 'consumer-failure'])('fails safely for %s with audited failure and no raw credential/exception payload', (mode) => {
    const f = fixture(); const consumer = vi.fn(() => { throw new Error(`private credential ${dummy}`); });
    const service = new SecretService(new EnvironmentSecretProvider(mode === 'missing' ? {} : { HAN_AI_STUDIO_SECRET_OPENAI: dummy }), new GovernanceService(f.governanceRepository, [grant]));
    let error: unknown;
    try { service.use(LOCAL_HAN, 'provider.openai', grant.scope, true, consumer); } catch (reason) { error = reason; }
    expect(String(error)).not.toContain(dummy); expect(String(error)).toMatch(/unavailable|failed safely/);
    if (mode === 'missing') expect(consumer).not.toHaveBeenCalled();
    const events = f.governanceRepository.list('workspace-a', 'secret', 'provider.openai');
    expect(events[0]).toMatchObject({ outcome: 'failed', code: mode === 'missing' ? 'secret_unavailable' : 'secret_use_failed' });
    expect(JSON.stringify(events)).not.toContain(dummy);
  });
});
