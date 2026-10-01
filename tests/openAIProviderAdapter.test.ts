// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OPENAI_MODEL_ID, OpenAIProviderAdapter } from '../src/adapters/openai/openAIProviderAdapter.ts';
import { EnvironmentSecretProvider } from '../src/storage/secrets/environmentSecretProvider.ts';

const apiKey = 'DUMMY-ONLY-openai-adapter-key';

describe('OpenAI Provider Adapter', () => {
  it('uses the Responses API and normalizes text and provider-reported usage without exposing the key', async () => {
    const request = vi.fn(async () => Response.json({
      status: 'completed',
      output: [
        { type: 'reasoning', content: [] },
        { type: 'message', content: [{ type: 'output_text', text: 'First paragraph.' }, { type: 'refusal', refusal: 'ignored' }] },
        { type: 'message', content: [{ type: 'output_text', text: 'Second paragraph.' }] },
      ],
      usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
    }));
    const adapter = new OpenAIProviderAdapter(new EnvironmentSecretProvider({ OPENAI_API_KEY: apiKey }), undefined, request as typeof fetch);

    const result = await adapter.execute({ agentId: 'agent-gpt', input: 'Give a concise answer.' });

    expect(result).toEqual({
      agentId: 'agent-gpt', providerId: 'openai', modelId: DEFAULT_OPENAI_MODEL_ID, mode: 'real', status: 'succeeded',
      output: 'First paragraph.\nSecond paragraph.',
      usage: { source: 'provider-reported', inputTokens: 12, outputTokens: 8, totalTokens: 20 },
    });
    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init).toMatchObject({ method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' } });
    expect(JSON.parse(String(init?.body))).toEqual({ model: DEFAULT_OPENAI_MODEL_ID, input: 'Give a concise answer.', store: false });
    expect(String(init?.body)).not.toContain(apiKey);
    expect(JSON.stringify(result)).not.toContain(apiKey);
  });

  it('accepts the aggregate text field and makes malformed usage unavailable', async () => {
    const request = vi.fn(async () => Response.json({ output_text: 'Aggregate output', usage: { input_tokens: 2, output_tokens: 3, total_tokens: 99 } }));
    const result = await new OpenAIProviderAdapter(new EnvironmentSecretProvider({ OPENAI_API_KEY: apiKey }), ' custom-model ', request as typeof fetch)
      .execute({ agentId: 'agent-gpt', input: 'Hello' });
    expect(result).toMatchObject({ modelId: 'custom-model', output: 'Aggregate output', usage: { source: 'unavailable', inputTokens: null, outputTokens: null, totalTokens: null } });
  });

  it.each([
    ['HTTP failure', () => new Response(JSON.stringify({ error: { message: `private ${apiKey}` } }), { status: 401 })],
    ['malformed JSON', () => new Response('{', { status: 200 })],
    ['missing text', () => Response.json({ status: 'completed', output: [{ type: 'reasoning' }] })],
    ['incomplete response', () => Response.json({ status: 'incomplete', output_text: 'partial' })],
  ])('fails safely for %s without returning provider payloads', async (_label, response) => {
    const adapter = new OpenAIProviderAdapter(new EnvironmentSecretProvider({ OPENAI_API_KEY: apiKey }), undefined, vi.fn(async () => response()) as typeof fetch);
    let error: unknown;
    try { await adapter.execute({ agentId: 'agent-gpt', input: 'Hello' }); } catch (reason) { error = reason; }
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain(apiKey);
    expect(String(error)).not.toContain('private');
  });
});
