import { describe, expect, it } from 'vitest';
import { MockProviderAdapter, MOCK_MODEL_ID } from '../src/adapters/mock/mockProviderAdapter.ts';
import { AdapterUnavailableError, AgentInvocationService, AgentUnavailableError, BindingUnconfiguredError, MalformedProviderResponseError, ProviderRequestFailedError, UnknownAgentError } from '../src/application/agents/agentInvocationService.ts';
import { initialAgentRegistry } from '../src/application/agents/initialAgentRegistry.ts';
import { ProviderAdapterRegistry } from '../src/application/providers/providerAdapterRegistry.ts';
import type { ProviderAdapter, ProviderBinding } from '../src/core/providers/provider.ts';

const configured: ProviderBinding = { providerId: 'mock', adapterId: 'mock', modelId: MOCK_MODEL_ID, status: 'configured' };
function service(adapter: ProviderAdapter<unknown, unknown> | null = new MockProviderAdapter(), binding: ProviderBinding | null = configured) {
  const registrations = adapter ? [{ descriptor: adapter.descriptor, adapter }] : [{ descriptor: { id: 'mock' as const, providerId: 'mock' as const, availability: 'unavailable' as const, capabilities: ['text-input' as const, 'text-output' as const] } }];
  return new AgentInvocationService(initialAgentRegistry, new ProviderAdapterRegistry(registrations), new Map(binding ? [['agent-gpt', binding]] : []));
}

describe('Agent invocation service', () => {
  it('executes deterministic Mock requests with machine-readable identity metadata', async () => {
    const invocation = service();
    const first = await invocation.invoke('agent-gpt', 'Hello'); const second = await invocation.invoke('agent-gpt', 'Hello');
    expect(first.output).toEqual(second.output); // Output stays deterministic; invocation identity/timing are per call.
    expect(first.measurement?.usage).toEqual(second.measurement?.usage);
    expect(first.measurement?.invocationId).not.toBe(second.measurement?.invocationId);
    expect(await invocation.invoke('agent-gpt', 'Hello')).toMatchObject({ agentId: 'agent-gpt', providerId: 'mock', modelId: 'mock-basic', mode: 'mock', status: 'succeeded', output: '[MOCK response for agent-gpt] Hello' });
    expect(initialAgentRegistry.resolve('agent-gpt')?.providerBinding.providerId).toBe('openai');
  });

  it('fails honestly for unknown, unavailable, unconfigured, and unavailable-adapter cases', async () => {
    await expect(service().invoke('missing', 'hello')).rejects.toBeInstanceOf(UnknownAgentError);
    await expect(service(new MockProviderAdapter(), null).invoke('agent-gpt', 'hello')).rejects.toBeInstanceOf(AgentUnavailableError);
    await expect(service(new MockProviderAdapter(), { ...configured, status: 'unconfigured' }).invoke('agent-gpt', 'hello')).rejects.toBeInstanceOf(BindingUnconfiguredError);
    await expect(service(null).invoke('agent-gpt', 'hello')).rejects.toBeInstanceOf(AdapterUnavailableError);
  });

  it('normalizes provider failures and rejects malformed responses without fallback', async () => {
    await expect(service().invoke('agent-gpt', '__mock_fail__')).rejects.toBeInstanceOf(ProviderRequestFailedError);
    const malformed: ProviderAdapter<unknown, unknown> = { descriptor: new MockProviderAdapter().descriptor, async execute(request) { return { agentId: request.agentId, providerId: 'mock', modelId: 'wrong-model', mode: 'mock', status: 'succeeded', output: 'bad' }; } };
    await expect(service(malformed).invoke('agent-gpt', 'hello')).rejects.toBeInstanceOf(MalformedProviderResponseError);
  });
});
