import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { executionFixture, executionInput } from './executionFixtures.ts';
import { MockProviderAdapter } from '../src/adapters/mock/mockProviderAdapter.ts';
import { SqliteTelemetryRepository } from '../src/storage/sqlite/sqliteTelemetryRepository.ts';
import { collaborationContext } from '../src/application/context/contextAssembler.ts';
import type { ProviderAdapter } from '../src/core/providers/provider.ts';
import { unavailableUsage } from '../src/core/telemetry/telemetry.ts';

const fixtures: ReturnType<typeof executionFixture>[] = [];
function fixture(adapter?: ProviderAdapter<unknown, unknown>) { const f = executionFixture(adapter); fixtures.push(f); return f; }
afterEach(async () => { vi.restoreAllMocks(); for (const f of fixtures.splice(0)) await f.close(); });
async function start(f: ReturnType<typeof fixture>, overrides = {}) {
  const row = f.service.create('workspace-a', { ...executionInput, ...overrides });
  f.service.control('workspace-a', row.id, 'start'); await f.service.waitForIdle(row.id); return f.service.get('workspace-a', row.id);
}
describe('Execution Context and Usage telemetry', () => {
  it('persists per-step invocation/context/provenance, bounded payload metadata and monotonic duration through pause/resume and reopening', async () => {
    const mock = new MockProviderAdapter(); const execute = vi.spyOn(mock, 'execute'); const f = fixture(mock);
    let row = await start(f); expect(row.status).toBe('paused');
    expect(f.telemetry.list('workspace-a', row.id)).toHaveLength(2);
    f.service.control('workspace-a', row.id, 'resume'); await f.service.waitForIdle(row.id); row = f.service.get('workspace-a', row.id);
    const events = f.telemetry.list('workspace-a', row.id); expect(events).toHaveLength(4);
    const finals = events.filter((event) => event.phase === 'final');
    expect(finals.map((event) => [event.agentId, event.providerId, event.modelId, event.context.scope?.stepId])).toEqual([['agent-gpt', 'mock', 'mock-basic', 'step-1'], ['agent-gemini', 'mock', 'mock-basic', 'step-2']]);
    for (const [i, event] of finals.entries()) {
      expect(event.status).toBe('succeeded'); expect(event.usage.source).toBe('synthetic'); expect(event.cost).toBeNull();
      expect(event.durationMs).toBeGreaterThanOrEqual(0); expect(Number.isFinite(event.durationMs)).toBe(true);
      expect(Date.parse(event.completedAt!)).toBeGreaterThanOrEqual(Date.parse(event.startedAt));
      expect(execute.mock.calls[i][0]).toMatchObject({ invocationId: event.invocationId, contextId: event.context.id });
      expect(event.context.inputChars).toBe(execute.mock.calls[i][0].input.length);
      expect(row.checkpoint.contributions[i].measurement).toMatchObject({ invocationId: event.invocationId, telemetry: 'persisted' });
    }
    const reopened = new SqliteTelemetryRepository(f.path);
    try { expect(reopened.list('workspace-a', row.id)).toEqual(events); expect(reopened.list('workspace-b', row.id)).toEqual([]); } finally { reopened.close(); }
    const text = JSON.stringify(events); expect(text).not.toContain(executionInput.goal); expect(text).not.toContain('[MOCK response');
    const db = new DatabaseSync(f.path);
    try { expect(db.prepare('SELECT COUNT(*) AS n FROM audit_events').get()?.n).toBe(0); expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]); expect(() => db.exec('DELETE FROM invocation_telemetry')).toThrow(/append-only/); expect(() => db.exec("UPDATE invocation_telemetry SET snapshot_json='{}'")).toThrow(/append-only/); } finally { db.close(); }
  });
  it('records provider failure without raw payload or invented usage and retains completed work', async () => {
    const mock = new MockProviderAdapter(); const f = fixture({ descriptor: mock.descriptor, async execute(request) { if (request.agentId === 'agent-gemini') throw new Error('DUMMY-PRIVATE-CREDENTIAL'); return mock.execute(request); } });
    const logs = [vi.spyOn(console, 'error'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'log')];
    const row = await start(f, { pauseAfterStep: false }); expect(row.status).toBe('failed'); expect(row.checkpoint.contributions).toHaveLength(1);
    const events = f.telemetry.list('workspace-a', row.id);
    expect(events.at(-1)).toMatchObject({ status: 'failed', code: 'provider_request_failed', usage: unavailableUsage, cost: null });
    expect(JSON.stringify(events)).not.toContain('DUMMY-PRIVATE-CREDENTIAL'); expect(JSON.stringify(row)).not.toContain('DUMMY-PRIVATE-CREDENTIAL');
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });
  it('records successful output with unavailable usage if the adapter reports none', async () => {
    const mock = new MockProviderAdapter(); const f = fixture({ descriptor: mock.descriptor, async execute(request) { const { usage: _usage, ...response } = await mock.execute(request); return response; } });
    const row = await start(f); expect(f.telemetry.list('workspace-a', row.id).at(-1)).toMatchObject({ status: 'succeeded', usage: unavailableUsage });
  });
  it('fails before provider invocation if required operational start persistence is unavailable, not as an authority denial', async () => {
    const mock = new MockProviderAdapter(); const execute = vi.spyOn(mock, 'execute'); const f = fixture(mock);
    vi.spyOn(f.telemetry, 'append').mockImplementation(() => { throw new Error('DUMMY disk detail'); });
    const row = await start(f); expect(row.failure?.code).toBe('telemetry_unavailable'); expect(row.status).toBe('failed'); expect(execute).not.toHaveBeenCalled();
    expect(row.failure?.message).toContain('not an authority denial'); expect(JSON.stringify(row)).not.toContain('DUMMY');
  });
  it('retains successful contributions if final telemetry fails and leaves an unmatched start observable after reopening', async () => {
    const f = fixture(); const append = f.telemetry.append.bind(f.telemetry);
    vi.spyOn(f.telemetry, 'append').mockImplementation((record) => { if (record.phase === 'final') throw new Error('disk unavailable'); append(record); });
    const row = await start(f, { participantAgentIds: ['agent-gpt'], pauseAfterStep: false });
    expect(row.status).toBe('completed'); expect(row.checkpoint.contributions[0].measurement?.telemetry).toBe('unconfirmed');
    expect(f.telemetry.list('workspace-a', row.id).map((event) => event.phase)).toEqual(['started']);
    const reopened = new SqliteTelemetryRepository(f.path); try { expect(reopened.list('workspace-a', row.id)[0].status).toBe('started'); } finally { reopened.close(); }
  });
  it('rejects forged operation scope and invalid Context before any provider executes', async () => {
    const mock = new MockProviderAdapter(); const execute = vi.spyOn(mock, 'execute'); const f = fixture(mock);
    const row = f.service.create('workspace-a', executionInput);
    const context = collaborationContext(row.plan, row.plan.steps[0], null, undefined, { workspaceId: 'workspace-b', executionId: row.id, taskId: row.taskId, stepId: 'step-1' });
    await expect(f.invocation.invoke('agent-gpt', context.input, context)).rejects.toHaveProperty('code', 'telemetry_unavailable');
    await expect(f.invocation.invoke('agent-gpt', context.input, { ...context, input: 'forged' })).rejects.toHaveProperty('code', 'invalid_context');
    expect(execute).not.toHaveBeenCalled(); expect(f.telemetry.list('workspace-a', row.id)).toEqual([]);
  });
  it('additively migrates populated Stage 11 data without altering records or fabricating historical telemetry', async () => {
    const f = fixture(); const measured = await start(f, { pauseAfterStep: false });
    // Stage 11 contributions did not carry Stage 12 measurements.
    const row = f.repository.save({ ...measured, checkpoint: { ...measured.checkpoint, contributions: measured.checkpoint.contributions.map(({ measurement: _measurement, ...contribution }) => contribution) } });
    const db = new DatabaseSync(f.path);
    try {
      // This disposable fixture emulates the exact pre-Stage-12 schema.
      db.exec('DROP TABLE invocation_telemetry; DELETE FROM schema_migrations WHERE version = 9; PRAGMA user_version = 8;');
      const upgraded = new SqliteTelemetryRepository(f.path);
      try { expect(f.repository.getById(row.id)).toEqual(row); expect(upgraded.list('workspace-a', row.id)).toEqual([]); expect(db.prepare('PRAGMA user_version').get()?.user_version).toBe(9); expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]); } finally { upgraded.close(); }
    } finally { db.close(); }
  });
  it('retains completed work on later context-construction failure without invoking the next provider', async () => {
    const mock = new MockProviderAdapter(); const execute = vi.spyOn(mock, 'execute'); const f = fixture(mock);
    const row = await start(f); const original = f.runtime.runNext.bind(f.runtime);
    vi.spyOn(f.runtime, 'runNext').mockImplementation((plan, contributions, scope) => original(plan, contributions, { ...scope!, stepId: 'wrong-step' }));
    f.service.control('workspace-a', row.id, 'resume'); await f.service.waitForIdle(row.id);
    expect(f.service.get('workspace-a', row.id)).toMatchObject({ status: 'failed', failure: { code: 'invalid_context' } });
    expect(f.service.get('workspace-a', row.id).checkpoint.contributions).toHaveLength(1); expect(execute).toHaveBeenCalledTimes(1);
    expect(f.telemetry.list('workspace-a', row.id)).toHaveLength(2);
  });
});
