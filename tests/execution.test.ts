import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockProviderAdapter } from '../src/adapters/mock/mockProviderAdapter.ts';
import { assertExecutionTransition, type ExecutionStatus } from '../src/core/executions/execution.ts';
import type { ProviderAdapter, ProviderResponse } from '../src/core/providers/provider.ts';
import { executionFixture, executionInput, deferred } from './executionFixtures.ts';

const fixtures: ReturnType<typeof executionFixture>[] = [];
function fixture(adapter?: ProviderAdapter<unknown, unknown>) { const f = executionFixture(adapter); fixtures.push(f); return f; }
afterEach(async () => { for (const f of fixtures.splice(0)) await f.close(); });

describe('Execution lifecycle and controls', () => {
  it('creates distinct durable attempts without changing Task, Agent or collaboration identity', () => {
    const f = fixture();
    const first = f.service.create('workspace-a', executionInput);
    const second = f.service.create('workspace-a', executionInput);
    expect(first).toMatchObject({ status: 'created', taskId: 'task-a', runtimeId: 'prototype-local', revision: 0, startedAt: null, checkpoint: { nextStepIndex: 0, contributions: [] } });
    expect(second.id).not.toBe(first.id);
    expect(f.service.get('workspace-a', first.id)).toEqual(first);
    expect(f.tasks.getById('task-a')).toMatchObject({ status: 'draft', goal: 'Independent Task goal' });
  });

  it.each(['sequential', 'review'])('starts and completes bounded %s work with provenance', async (collaborationMode) => {
    const f = fixture();
    const e = f.service.create('workspace-a', { ...executionInput, collaborationMode, pauseAfterStep: false });
    expect(f.service.control('workspace-a', e.id, 'start').status).toBe('running');
    await f.service.waitForIdle(e.id);
    const done = f.service.get('workspace-a', e.id);
    expect(done).toMatchObject({ status: 'completed', failure: null, checkpoint: { nextStepIndex: 2, currentStepId: null } });
    expect(done.startedAt).not.toBeNull(); expect(done.finishedAt).not.toBeNull();
    expect(done.checkpoint.contributions.map((c) => [c.agentId, c.providerId, c.mode])).toEqual([['agent-gpt', 'mock', 'mock'], ['agent-gemini', 'mock', 'mock']]);
    expect(done.checkpoint.contributions[1].handoff?.sourceAgentId).toBe('agent-gpt');
  });

  it('pauses at a genuine safe boundary, starts no next step, and resumes without repeating work', async () => {
    const mock = new MockProviderAdapter(); const calls = vi.spyOn(mock, 'execute'); const f = fixture(mock);
    const e = f.service.create('workspace-a', executionInput);
    f.service.control('workspace-a', e.id, 'start'); await f.service.waitForIdle(e.id);
    expect(f.service.get('workspace-a', e.id)).toMatchObject({ status: 'paused', pendingControl: null, checkpoint: { nextStepIndex: 1, currentStepId: null } });
    expect(calls).toHaveBeenCalledTimes(1);
    await Promise.resolve(); expect(calls).toHaveBeenCalledTimes(1);
    f.service.control('workspace-a', e.id, 'resume'); await f.service.waitForIdle(e.id);
    expect(calls.mock.calls.map(([input]) => input.agentId)).toEqual(['agent-gpt', 'agent-gemini']);
    expect(f.service.get('workspace-a', e.id).status).toBe('completed');
  });

  it.each(['pause', 'cancel'] as const)('honors an in-flight %s request after settling and preserves the returned output', async (action) => {
    const entered = deferred<void>(); const response = deferred<ProviderResponse<unknown>>(); const mock = new MockProviderAdapter();
    const execute = vi.fn(async () => { entered.resolve(); return response.promise; });
    const f = fixture({ descriptor: mock.descriptor, execute });
    const e = f.service.create('workspace-a', { ...executionInput, pauseAfterStep: false });
    f.service.control('workspace-a', e.id, 'start'); await entered.promise;
    try {
      expect(f.service.control('workspace-a', e.id, action)).toMatchObject({ status: 'running', pendingControl: action, checkpoint: { currentStepId: 'step-1' } });
      expect(() => f.service.control('workspace-a', e.id, 'resume')).toThrow();
    } finally { response.resolve(await mock.execute({ agentId: 'agent-gpt', input: 'Preserved in-flight output' })); }
    await f.service.waitForIdle(e.id);
    expect(f.service.get('workspace-a', e.id)).toMatchObject({ status: action === 'pause' ? 'paused' : 'cancelled', checkpoint: { nextStepIndex: 1 } });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(f.service.get('workspace-a', e.id).checkpoint.contributions[0].output).toContain('Preserved in-flight output');
  });

  it('allows cancellation to supersede pending pause without losing either returned work or authority', async () => {
    const entered = deferred<void>(); const response = deferred<ProviderResponse<unknown>>(); const mock = new MockProviderAdapter();
    const f = fixture({ descriptor: mock.descriptor, async execute() { entered.resolve(); return response.promise; } });
    const e = f.service.create('workspace-a', executionInput); f.service.control('workspace-a', e.id, 'start'); await entered.promise;
    try { f.service.control('workspace-a', e.id, 'pause'); f.service.control('workspace-a', e.id, 'cancel'); }
    finally { response.resolve(await mock.execute({ agentId: 'agent-gpt', input: 'useful' })); }
    await f.service.waitForIdle(e.id); expect(f.service.get('workspace-a', e.id).status).toBe('cancelled');
  });

  it('cancels before starting without invoking any Agent', async () => {
    const mock = new MockProviderAdapter(); const calls = vi.spyOn(mock, 'execute'); const f = fixture(mock);
    const e = f.service.create('workspace-a', executionInput);
    expect(f.service.control('workspace-a', e.id, 'cancel').status).toBe('cancelled');
    expect(calls).not.toHaveBeenCalled();
  });

  it('honors a pause requested before the first step starts', async () => {
    const mock = new MockProviderAdapter(); const calls = vi.spyOn(mock, 'execute'); const f = fixture(mock);
    const e = f.service.create('workspace-a', executionInput);
    f.service.control('workspace-a', e.id, 'start'); f.service.control('workspace-a', e.id, 'pause');
    await f.service.waitForIdle(e.id);
    expect(f.service.get('workspace-a', e.id)).toMatchObject({ status: 'paused', checkpoint: { nextStepIndex: 0 } });
    expect(calls).not.toHaveBeenCalled();
  });

  it('cancels a paused attempt without erasing the checkpoint', async () => {
    const f = fixture(); const e = f.service.create('workspace-a', executionInput);
    f.service.control('workspace-a', e.id, 'start'); await f.service.waitForIdle(e.id);
    const before = f.service.get('workspace-a', e.id).checkpoint;
    expect(f.service.control('workspace-a', e.id, 'cancel')).toMatchObject({ status: 'cancelled', checkpoint: before });
    expect(() => f.service.control('workspace-a', e.id, 'resume')).toThrow();
  });

  it('attributes downstream failure and preserves the earlier contribution without fallback or retries', async () => {
    const mock = new MockProviderAdapter();
    const execute = vi.fn(async (input: Parameters<typeof mock.execute>[0]) => { if (input.agentId === 'agent-gemini') throw new Error('secret'); return mock.execute(input); });
    const f = fixture({ descriptor: mock.descriptor, execute });
    const e = f.service.create('workspace-a', { ...executionInput, pauseAfterStep: false });
    f.service.control('workspace-a', e.id, 'start'); await f.service.waitForIdle(e.id);
    const failed = f.service.get('workspace-a', e.id);
    expect(failed).toMatchObject({ status: 'failed', failure: { code: 'provider_request_failed', agentId: 'agent-gemini', stepId: 'step-2' }, checkpoint: { nextStepIndex: 1 } });
    expect(failed.checkpoint.contributions[0].agentId).toBe('agent-gpt');
    expect(execute).toHaveBeenCalledTimes(2); expect(JSON.stringify(failed)).not.toContain('secret');
  });

  it('rejects duplicate starts and invalid controls on created/completed executions', async () => {
    const f = fixture(); const e = f.service.create('workspace-a', { ...executionInput, pauseAfterStep: false });
    expect(() => f.service.control('workspace-a', e.id, 'pause')).toThrow();
    expect(() => f.service.control('workspace-a', e.id, 'resume')).toThrow();
    f.service.control('workspace-a', e.id, 'start'); expect(() => f.service.control('workspace-a', e.id, 'start')).toThrow();
    await f.service.waitForIdle(e.id);
    for (const action of ['start', 'resume', 'pause', 'cancel'] as const) expect(() => f.service.control('workspace-a', e.id, action)).toThrow();
  });

  it('enforces Workspace/Task scope and input validity', () => {
    const f = fixture();
    expect(() => f.service.create('missing', executionInput)).toThrow();
    expect(() => f.service.create('workspace-b', executionInput)).toThrow();
    expect(() => f.service.create('workspace-a', { ...executionInput, pauseAfterStep: 'true' })).toThrow();
    expect(() => f.service.create('workspace-a', { ...executionInput, collaborationMode: 'invalid' })).toThrow();
    const e = f.service.create('workspace-a', executionInput);
    expect(() => f.service.get('workspace-b', e.id)).toThrow();
    expect(() => f.service.control('workspace-b', e.id, 'start')).toThrow();
  });

  it('rejects stale checkpoint writes atomically', () => {
    const f = fixture(); const e = f.service.create('workspace-a', executionInput);
    f.repository.save(e);
    expect(() => f.repository.save(e)).toThrow(/changed since/);
    expect(f.repository.getById(e.id)?.revision).toBe(1);
  });

  it('rejects an inconsistent durable checkpoint instead of skipping or replaying work', () => {
    const f = fixture(); const e = f.service.create('workspace-a', executionInput);
    f.repository.save({ ...e, status: 'paused', checkpoint: { ...e.checkpoint, nextStepIndex: 1 } });
    expect(() => f.service.control('workspace-a', e.id, 'resume')).toThrow(/checkpoint is inconsistent/);
  });

  it('does not label a failed in-flight call paused merely because pause was requested', async () => {
    const entered = deferred<void>(); const response = deferred<ProviderResponse<unknown>>(); const mock = new MockProviderAdapter();
    const f = fixture({ descriptor: mock.descriptor, async execute() { entered.resolve(); return response.promise; } });
    const e = f.service.create('workspace-a', executionInput); f.service.control('workspace-a', e.id, 'start'); await entered.promise;
    try { f.service.control('workspace-a', e.id, 'pause'); } finally { response.reject(new Error('private backend error')); }
    await f.service.waitForIdle(e.id);
    expect(f.service.get('workspace-a', e.id)).toMatchObject({ status: 'failed', pendingControl: null, failure: { code: 'provider_request_failed', stepId: 'step-1' } });
  });

  it('refuses control by an unavailable runtime rather than silently switching location', () => {
    const f = fixture(); const e = f.service.create('workspace-a', executionInput);
    f.repository.save({ ...e, runtimeId: 'unavailable-runtime' });
    expect(() => f.service.control('workspace-a', e.id, 'start')).toThrow(/recorded execution runtime is unavailable/);
  });

  it('stops on a checkpoint write failure before invoking further Agents', async () => {
    const mock = new MockProviderAdapter(); const calls = vi.spyOn(mock, 'execute'); const f = fixture(mock);
    const e = f.service.create('workspace-a', { ...executionInput, pauseAfterStep: false });
    const original = f.repository.save.bind(f.repository);
    const save = vi.spyOn(f.repository, 'save').mockImplementation((value) => {
      if (value.checkpoint.contributions.length) throw new Error('disk unavailable');
      return original(value);
    });
    f.service.control('workspace-a', e.id, 'start'); await f.service.waitForIdle(e.id);
    expect(calls).toHaveBeenCalledTimes(1);
    expect(() => f.service.get('workspace-a', e.id)).toThrow(/checkpoint could not be saved/);
    expect(() => f.service.list('workspace-a')).toThrow(/checkpoint could not be saved/);
    save.mockRestore();
  });

  it.each(['cancelled', 'interrupted', 'failed', 'completed'] as ExecutionStatus[])('keeps %s terminal', (status) => {
    expect(() => assertExecutionTransition(status, 'running')).toThrow();
    expect(() => assertExecutionTransition(status, 'cancelled')).toThrow();
  });
  it.each([['created', 'running'], ['running', 'paused'], ['paused', 'running'], ['running', 'completed'], ['running', 'failed'], ['running', 'interrupted']] as [ExecutionStatus, ExecutionStatus][])('permits %s → %s', (from, to) => { expect(() => assertExecutionTransition(from, to)).not.toThrow(); });
});
