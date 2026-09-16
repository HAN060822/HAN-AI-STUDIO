import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialProviderAdapterRegistry } from '../src/application/providers/initialProviderAdapterRegistry.ts';
import { ProviderAdapterRegistry } from '../src/application/providers/providerAdapterRegistry.ts';
import type { ProviderAdapter, ProviderAdapterDescriptor } from '../src/core/providers/provider.ts';

afterEach(() => vi.unstubAllGlobals());

describe('Provider Adapter contracts', () => {
  it('exposes unavailable descriptors without executable or network-backed adapters', () => {
    expect(initialProviderAdapterRegistry.listDescriptors().map(({ id, providerId, availability }) => ({ id, providerId, availability }))).toEqual([
      { id: 'openai', providerId: 'openai', availability: 'unavailable' },
      { id: 'gemini', providerId: 'google', availability: 'unavailable' },
      { id: 'codex', providerId: 'codex', availability: 'unavailable' },
    ]);
    expect(initialProviderAdapterRegistry.resolveDescriptor('gemini')?.capabilities).toEqual(['text-input', 'text-output']);
    expect(initialProviderAdapterRegistry.resolve('openai')).toBeNull();
    expect(initialProviderAdapterRegistry.resolveDescriptor('unknown')).toBeNull();
  });

  it('represents normalized request/response execution with a deterministic fake only', async () => {
    const network = vi.fn();
    vi.stubGlobal('fetch', network);
    const descriptor: ProviderAdapterDescriptor = { id: 'openai', providerId: 'openai', availability: 'available', capabilities: ['text-input', 'text-output'] };
    const fake: ProviderAdapter<unknown, unknown> = {
      descriptor,
      async execute(request) {
        return { agentId: request.agentId, providerId: descriptor.providerId, modelId: 'fake-model', mode: 'mock', status: 'succeeded', output: `FAKE: ${request.input}` };
      },
    };
    const registry = new ProviderAdapterRegistry([{ descriptor, adapter: fake }]);
    const response = await registry.resolve('openai')?.execute({ agentId: 'agent-gpt', input: 'Stage 5 contract' });
    expect(response).toEqual({ agentId: 'agent-gpt', providerId: 'openai', modelId: 'fake-model', mode: 'mock', status: 'succeeded', output: 'FAKE: Stage 5 contract' });
    expect(network).not.toHaveBeenCalled();
  });
});
