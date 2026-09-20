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
    const output = `[MOCK response for ${request.agentId}] ${request.input}`;
    // Deliberately synthetic test counters, not a tokenizer or billable usage.
    const inputTokens = Math.ceil(request.input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    return {
      agentId: request.agentId,
      providerId: 'mock' as const,
      modelId: MOCK_MODEL_ID,
      mode: 'mock' as const,
      status: 'succeeded' as const,
      output,
      usage: { source: 'synthetic' as const, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
    };
  }
}
