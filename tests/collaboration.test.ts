import { describe, expect, it, vi } from 'vitest';
import { MockProviderAdapter } from '../src/adapters/mock/mockProviderAdapter.ts';
import { AgentInvocationService } from '../src/application/agents/agentInvocationService.ts';
import { initialAgentRegistry } from '../src/application/agents/initialAgentRegistry.ts';
import { OrchestratorService, type AgentInvoker } from '../src/application/collaboration/orchestratorService.ts';
import { DeterministicCollaborationPlanner } from '../src/application/collaboration/collaborationPlanner.ts';
import { ProviderAdapterRegistry } from '../src/application/providers/providerAdapterRegistry.ts';
import type { AgentId } from '../src/core/agents/agent.ts';
import type { CollaborationPlan, CollaborationRequest } from '../src/core/collaboration/collaboration.ts';
import type { ProviderAdapter, ProviderBinding } from '../src/core/providers/provider.ts';

const request: CollaborationRequest = { goal: 'Assess a local-first studio.', participantAgentIds: ['agent-gpt', 'agent-gemini'], collaborationMode: 'sequential' };
const binding: ProviderBinding = { providerId: 'mock', adapterId: 'mock', modelId: 'mock-basic', status: 'configured' };
function fixture(adapter: ProviderAdapter<unknown, unknown> = new MockProviderAdapter(), bindings = new Map<AgentId, ProviderBinding>([['agent-gpt', binding], ['agent-gemini', binding]])) {
  const execute = vi.spyOn(adapter, 'execute');
  const invocation = new AgentInvocationService(initialAgentRegistry, new ProviderAdapterRegistry([{ descriptor: adapter.descriptor, adapter }]), bindings);
  return { orchestrator: new OrchestratorService(invocation), invocation, execute };
}

describe('bounded collaboration', () => {
  it.each(['sequential', 'review'] as const)('runs %s in selected order with distinct identities, structured context and final provenance', async (mode) => {
    const { orchestrator, execute } = fixture();
    const result = await orchestrator.collaborate({ ...request, collaborationMode: mode, chatHistory: 'PRIVATE CHAT MUST NOT BE COPIED' });
    expect(result.status).toBe('succeeded');
    expect(execute.mock.calls.map(([call]) => call.agentId)).toEqual(request.participantAgentIds);
    expect(execute).toHaveBeenCalledTimes(2); // Codex is not selected or substituted.
    expect(result.contributions.map((item) => [item.stepId, item.agentId, item.providerId, item.mode])).toEqual([['step-1', 'agent-gpt', 'mock', 'mock'], ['step-2', 'agent-gemini', 'mock', 'mock']]);
    expect(result.contributions[1].handoff).toMatchObject({ sourceAgentId: 'agent-gpt', targetAgentId: 'agent-gemini', originalGoal: request.goal, relevantContribution: result.contributions[0].output, contributionTruncated: false });
    expect(execute.mock.calls[1][0].input).toContain(result.contributions[0].output);
    expect(execute.mock.calls[1][0].input).toContain(mode === 'review' ? 'Review and challenge' : 'Continue from');
    expect(JSON.stringify(result)).not.toContain('PRIVATE CHAT');
    expect(result.finalContribution).toEqual(result.contributions[1]);
    expect(result.finalContribution).toMatchObject({ agentId: 'agent-gemini', agentDisplayName: 'Gemini', modelId: 'mock-basic' });
    expect(result.mode).toBe(mode);
    expect(initialAgentRegistry.list().every((agent) => agent.status === 'unavailable' && agent.providerBinding.status === 'unconfigured')).toBe(true);
  });

  it('uses the same abstraction for a single explicitly selected Agent', async () => {
    const { orchestrator, execute } = fixture();
    const result = await orchestrator.collaborate({ ...request, participantAgentIds: ['agent-gemini'] });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.finalContribution).toMatchObject({ agentId: 'agent-gemini', stepId: 'step-1', handoff: null });
  });

  it('respects reversed selection order rather than hardcoding GPT first', async () => {
    const { orchestrator, execute } = fixture();
    await orchestrator.collaborate({ ...request, participantAgentIds: ['agent-gemini', 'agent-gpt'], collaborationMode: 'review' });
    expect(execute.mock.calls.map(([call]) => call.agentId)).toEqual(['agent-gemini', 'agent-gpt']);
  });

  it('bounds prior context without accumulating Chat or overflowing the invocation limit', async () => {
    const mock = new MockProviderAdapter();
    const adapter: ProviderAdapter<unknown, unknown> = { descriptor: mock.descriptor, async execute(input) { return { ...await mock.execute(input), output: 'x'.repeat(6000) }; } };
    const { orchestrator, execute } = fixture(adapter, new Map([['agent-gpt', binding], ['agent-gemini', binding], ['agent-codex', binding]]));
    const result = await orchestrator.collaborate({ ...request, goal: '\\'.repeat(500), participantAgentIds: ['agent-gpt', 'agent-gemini', 'agent-codex'] });
    expect(result.status).toBe('succeeded');
    expect(result.contributions[2].handoff).toMatchObject({ sourceAgentId: 'agent-gemini', targetAgentId: 'agent-codex', contributionTruncated: true, relevantContribution: 'x'.repeat(800) });
    expect(execute.mock.calls.every(([input]) => input.input.length <= 2000)).toBe(true);
  });

  it.each([
    { collaborationMode: 'parallel' }, { goal: '' }, { goal: 'x'.repeat(501) },
    { participantAgentIds: [] }, { participantAgentIds: ['agent-gpt', 'agent-gpt'] },
    { participantAgentIds: [null] }, { participantAgentIds: ['a', 'b', 'c', 'd'] },
    { collaborationMode: 'review', participantAgentIds: ['agent-gpt'] },
  ])('rejects invalid request %j before any invocation', async (override) => {
    const { orchestrator, execute } = fixture();
    await expect(orchestrator.collaborate({ ...request, ...override })).rejects.toHaveProperty('name', 'CollaborationValidationError');
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    { steps: [] }, { steps: [{ id: 'step-1', agentId: 'agent-codex' }] },
    { steps: [{ id: 'step-1', agentId: 'agent-gpt' }, { id: 'step-1', agentId: 'agent-gemini' }] },
    { goal: 'Changed goal' }, { mode: 'review' },
  ])('rejects invalid/empty/expanded plans %j', async (override) => {
    const { invocation, execute } = fixture();
    const orchestrator = new OrchestratorService(invocation, { plan(input) { return { ...new DeterministicCollaborationPlanner().plan(input), ...override } as CollaborationPlan; } });
    await expect(orchestrator.collaborate(request)).rejects.toHaveProperty('code', 'invalid_plan');
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([['missing', 'unknown_agent'], ['agent-codex', 'agent_unavailable']])('fails preflight for %s without invoking other Agents', async (id, code) => {
    const { orchestrator, execute } = fixture();
    const result = await orchestrator.collaborate({ ...request, participantAgentIds: ['agent-gpt', id] });
    expect(result).toMatchObject({ status: 'failed', contributions: [], finalContribution: null, failure: { agentId: id, code, stepId: 'step-2' } });
    expect(execute).not.toHaveBeenCalled();
  });

  it('fails an unconfigured binding without advertising it as invokable', async () => {
    const { orchestrator, invocation, execute } = fixture(new MockProviderAdapter(), new Map([['agent-gpt', binding], ['agent-gemini', { ...binding, status: 'unconfigured' }]]));
    expect(invocation.listTargets().map((target) => target.agentId)).toEqual(['agent-gpt']);
    expect(await orchestrator.collaborate(request)).toMatchObject({ status: 'failed', failure: { code: 'binding_unconfigured' } });
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not fall back to registered Mock when a real adapter is unavailable', async () => {
    const { orchestrator, execute } = fixture(new MockProviderAdapter(), new Map([['agent-gpt', binding], ['agent-gemini', { providerId: 'google', adapterId: 'gemini', modelId: 'real-model', status: 'configured' }]]));
    expect(await orchestrator.collaborate(request)).toMatchObject({ status: 'failed', contributions: [], failure: { code: 'adapter_unavailable', agentId: 'agent-gemini' } });
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(['sequential', 'review'] as const)('preserves completed contributions when a required %s step fails; no substitution, retry or false final', async (mode) => {
    const mock = new MockProviderAdapter();
    const adapter: ProviderAdapter<unknown, unknown> = { descriptor: mock.descriptor, async execute(input) { if (input.agentId === 'agent-gemini') throw new Error('secret must not escape'); return mock.execute(input); } };
    const { orchestrator, execute } = fixture(adapter);
    const result = await orchestrator.collaborate({ ...request, collaborationMode: mode });
    expect(result).toMatchObject({ status: 'failed', finalContribution: null, failure: { code: 'provider_request_failed', stepId: 'step-2', agentId: 'agent-gemini' } });
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0].agentId).toBe('agent-gpt');
    expect(execute.mock.calls.map(([input]) => input.agentId)).toEqual(['agent-gpt', 'agent-gemini']);
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it.each([null, { output: 42 }, { mode: 'real' }])('normalizes malformed provider output %j', async (override) => {
    const mock = new MockProviderAdapter();
    const adapter = { descriptor: mock.descriptor, async execute(input: Parameters<typeof mock.execute>[0]) { return override === null ? null : { ...await mock.execute(input), ...override }; } } as ProviderAdapter<unknown, unknown>;
    expect(await fixture(adapter).orchestrator.collaborate(request)).toMatchObject({ status: 'failed', contributions: [], failure: { code: 'malformed_provider_response' } });
  });

  it('rejects malformed invocation contributions at the orchestration port', async () => {
    const invoker = { assertInvokable() {}, invoke: vi.fn(async () => ({ agentId: 'agent-codex' })) } as unknown as AgentInvoker;
    expect(await new OrchestratorService(invoker).collaborate(request)).toMatchObject({ status: 'failed', contributions: [], failure: { code: 'malformed_contribution' } });
    expect(invoker.invoke).toHaveBeenCalledTimes(1);
  });

  it('does not leak unexpected port errors', async () => {
    const invoker: AgentInvoker = { assertInvokable() {}, async invoke() { throw new Error('secret'); } };
    const result = await new OrchestratorService(invoker).collaborate(request);
    expect(result).toMatchObject({ status: 'failed', failure: { code: 'collaboration_failed', message: 'Collaboration failed safely.' } });
  });
});
