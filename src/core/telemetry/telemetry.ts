import type { ContextSnapshot } from '../context/context.ts';
export type Usage = Readonly<{
  source: 'provider-reported' | 'synthetic' | 'unavailable';
  inputTokens: number | null; outputTokens: number | null; totalTokens: number | null;
}>;
export const unavailableUsage: Usage = Object.freeze({ source: 'unavailable', inputTokens: null, outputTokens: null, totalTokens: null });
export function normalizeUsage(value: unknown, mode: 'mock' | 'real'): Usage {
  if (!value || typeof value !== 'object') return unavailableUsage;
  const source = value as Partial<Usage>;
  if ((source.source !== 'provider-reported' && source.source !== 'synthetic') || (mode === 'mock' ? source.source !== 'synthetic' : source.source === 'synthetic')) return unavailableUsage;
  const count = (n: unknown): n is number | null => n === null || (typeof n === 'number' && Number.isSafeInteger(n) && n >= 0);
  if (![source.inputTokens, source.outputTokens, source.totalTokens].every(count)) return unavailableUsage;
  if (source.inputTokens !== null && source.outputTokens !== null && source.totalTokens !== null && source.totalTokens !== source.inputTokens! + source.outputTokens!) return unavailableUsage;
  return { source: source.source, inputTokens: source.inputTokens!, outputTokens: source.outputTokens!, totalTokens: source.totalTokens! };
}
export type InvocationMeasurement = Readonly<{
  invocationId: string; contextId: string; startedAt: string; completedAt: string; durationMs: number;
  usage: Usage; cost: null; telemetry: 'persisted' | 'unconfirmed' | 'not-recorded';
}>;
export type TelemetryRecord = Readonly<{
  invocationId: string; phase: 'started' | 'final'; schemaVersion: 1;
  agentId: string; providerId: string; modelId: string; mode: 'mock' | 'real';
  context: ContextSnapshot;
  startedAt: string; completedAt: string | null; durationMs: number | null;
  status: 'started' | 'succeeded' | 'failed'; code: 'ok' | 'provider_request_failed' | 'malformed_provider_response';
  usage: Usage; cost: null;
}>;
