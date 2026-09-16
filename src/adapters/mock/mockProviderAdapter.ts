import type { ProviderAdapter, ProviderAdapterDescriptor } from '../../core/providers/provider.ts';

export const MOCK_MODEL_ID = 'mock-basic' as const;

export class MockProviderAdapter implements ProviderAdapter<unknown, unknown> {
  readonly descriptor: ProviderAdapterDescriptor = {
    id: 'mock',
    providerId: 'mock',
    availability: 'available',
    capabilities: ['text-input', 'text-output'],
  };

  async execute(request: Parameters<ProviderAdapter<unknown, unknown>['execute']>[0]) {
    if (request.input === '__mock_fail__') throw new Error('Controlled mock failure.');
    return {
      agentId: request.agentId,
      providerId: 'mock' as const,
      modelId: MOCK_MODEL_ID,
      mode: 'mock' as const,
      status: 'succeeded' as const,
      output: `[MOCK response for ${request.agentId}] ${request.input}`,
    };
  }
}
