import type { SecretProvider } from '../../application/secrets/secretProvider.ts';
import type { ProviderAdapter, ProviderAdapterDescriptor } from '../../core/providers/provider.ts';
import { unavailableUsage, type Usage } from '../../core/telemetry/telemetry.ts';

export const DEFAULT_OPENAI_MODEL_ID = 'gpt-5.6-luna' as const;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractText(payload: JsonRecord): string | null {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  if (!Array.isArray(payload.output)) return null;
  const parts: string[] = [];
  for (const item of payload.output) {
    if (!isRecord(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) parts.push(content.text.trim());
    }
  }
  return parts.length > 0 ? parts.join('\n') : null;
}

function normalizeOpenAIUsage(value: unknown): Usage {
  if (!isRecord(value)) return unavailableUsage;
  const count = (candidate: unknown): candidate is number => typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate >= 0;
  if (!count(value.input_tokens) || !count(value.output_tokens) || !count(value.total_tokens)) return unavailableUsage;
  if (value.total_tokens !== value.input_tokens + value.output_tokens) return unavailableUsage;
  return { source: 'provider-reported', inputTokens: value.input_tokens, outputTokens: value.output_tokens, totalTokens: value.total_tokens };
}

export class OpenAIProviderAdapter implements ProviderAdapter<unknown, unknown> {
  private readonly secrets: SecretProvider;
  private readonly request: typeof fetch;
  readonly descriptor: ProviderAdapterDescriptor = {
    id: 'openai',
    providerId: 'openai',
    availability: 'available',
    capabilities: ['text-input', 'text-output'],
  };

  private readonly modelId: string;

  constructor(
    secrets: SecretProvider,
    modelId: string = DEFAULT_OPENAI_MODEL_ID,
    request: typeof fetch = fetch,
  ) {
    this.secrets = secrets;
    this.request = request;
    this.modelId = modelId.trim();
    if (!this.modelId) throw new Error('OpenAI model configuration is invalid.');
  }

  async execute(input: Parameters<ProviderAdapter<unknown, unknown>['execute']>[0]) {
    let operation: Promise<Response> | undefined;
    this.secrets.use('provider.openai', (apiKey) => {
      operation = this.request('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.modelId, input: input.input, store: false }),
      });
    });
    if (!operation) throw new Error('OpenAI request could not be started safely.');

    let response: Response;
    try { response = await operation; }
    catch { throw new Error('OpenAI request failed safely.'); }
    if (!response.ok) {
      let category = 'provider_error';
      try {
        const errorPayload = await response.json() as unknown;
        if (isRecord(errorPayload) && isRecord(errorPayload.error)) {
          const code = errorPayload.error.code;
          const type = errorPayload.error.type;
          if (code === 'insufficient_quota') category = 'insufficient_quota';
          else if (code === 'invalid_api_key' || type === 'invalid_request_error' && response.status === 401) category = 'invalid_api_key';
          else if (code === 'model_not_found') category = 'model_not_found';
          else if (response.status === 429) category = 'rate_limit';
          else if (response.status >= 500) category = 'provider_unavailable';
        }
      } catch { /* keep generic safe category */ }
      throw new Error(`OpenAI request failed safely: ${category}.`);
    }

    let payload: unknown;
    try { payload = await response.json(); }
    catch { throw new Error('OpenAI returned an invalid response.'); }
    if (!isRecord(payload) || (payload.status !== undefined && payload.status !== 'completed')) throw new Error('OpenAI returned an invalid response.');
    const output = extractText(payload);
    if (!output) throw new Error('OpenAI returned an invalid response.');

    return {
      agentId: input.agentId,
      providerId: 'openai' as const,
      modelId: this.modelId,
      mode: 'real' as const,
      status: 'succeeded' as const,
      output,
      usage: normalizeOpenAIUsage(payload.usage),
    };
  }
}
