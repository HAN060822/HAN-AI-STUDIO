import { describe, expect, it } from 'vitest';
import { MockProviderAdapter } from '../src/adapters/mock/mockProviderAdapter.ts';
import { normalizeUsage, unavailableUsage } from '../src/core/telemetry/telemetry.ts';

describe('Normalized usage is not billing', () => {
  it('marks deterministic Mock counters synthetic and never claims provider billing', async () => {
    const mock = new MockProviderAdapter(); const request = { agentId: 'agent-gpt' as const, input: 'hello' };
    const a = await mock.execute(request); const b = await mock.execute(request);
    expect(a.usage).toEqual(b.usage); expect(a.usage.source).toBe('synthetic');
    expect(a.usage.inputTokens).toBe(2); expect(a.usage.totalTokens).toBe(a.usage.inputTokens + a.usage.outputTokens);
    expect(normalizeUsage(a.usage, 'mock')).toEqual(a.usage); expect(normalizeUsage(a.usage, 'real')).toEqual(unavailableUsage);
  });
  it.each([undefined, null, {}, { source: 'provider-reported', inputTokens: -1, outputTokens: 2, totalTokens: 1 }, { source: 'provider-reported', inputTokens: 1.5, outputTokens: 2, totalTokens: 3.5 }, { source: 'provider-reported', inputTokens: 1, outputTokens: 2, totalTokens: 99 }, { source: 'provider-reported', inputTokens: NaN, outputTokens: 2, totalTokens: null }])('leaves absent or invalid usage unknown: %#', (value) => {
    expect(normalizeUsage(value, 'real')).toEqual(unavailableUsage);
  });
  it('retains partial provider counts without inferring missing totals or copying raw extensions', () => {
    expect(normalizeUsage({ source: 'provider-reported', inputTokens: 17, outputTokens: null, totalTokens: null, credential: 'DUMMY' }, 'real')).toEqual({ source: 'provider-reported', inputTokens: 17, outputTokens: null, totalTokens: null });
    expect(normalizeUsage({ source: 'provider-reported', inputTokens: 0, outputTokens: 0, totalTokens: 0 }, 'real')).toEqual({ source: 'provider-reported', inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    expect(normalizeUsage({ source: 'provider-reported', inputTokens: 1, outputTokens: 1, totalTokens: 2 }, 'mock')).toEqual(unavailableUsage);
  });
});
