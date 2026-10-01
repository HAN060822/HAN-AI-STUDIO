// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';
import { EnvironmentSecretProvider } from '../src/storage/secrets/environmentSecretProvider.ts';

afterEach(() => vi.unstubAllGlobals());

describe('Real OpenAI server composition', () => {
  it('binds only agent-gpt in openai mode and returns a real result through the existing API', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-openai-api-'));
    const localFetch = globalThis.fetch;
    const providerRequest = vi.fn(async () => Response.json({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'Real adapter response' }] }],
      usage: { input_tokens: 4, output_tokens: 3, total_tokens: 7 },
    }));
    vi.stubGlobal('fetch', providerRequest);
    const runtime = await startStudioServer({
      port: 0,
      databasePath: join(directory, 'studio.sqlite'),
      providerMode: 'openai',
      openaiModel: 'gpt-server-test',
      secretProvider: new EnvironmentSecretProvider({ OPENAI_API_KEY: 'DUMMY-ONLY-server-openai-key' }),
    });
    try {
      const address = runtime.server.address();
      if (!address || typeof address === 'string') throw new Error('Expected TCP address');
      const base = `http://127.0.0.1:${address.port}`;
      const targets = await (await localFetch(`${base}/api/agents/invocation-targets`)).json() as { targets: unknown[] };
      expect(targets.targets).toEqual([{ agentId: 'agent-gpt', displayName: 'GPT', backendMode: 'real', providerId: 'openai', modelId: 'gpt-server-test' }]);

      const response = await localFetch(`${base}/api/agents/agent-gpt/invoke`, { method: 'POST', body: JSON.stringify({ input: 'Server composition proof' }) });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ result: { agentId: 'agent-gpt', providerId: 'openai', modelId: 'gpt-server-test', mode: 'real', status: 'succeeded', output: 'Real adapter response' } });
      expect(providerRequest).toHaveBeenCalledOnce();
    } finally {
      await runtime.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('does not expose an invokable target when openai mode has no configured OpenAI secret', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-openai-missing-secret-'));
    const runtime = await startStudioServer({ port: 0, databasePath: join(directory, 'studio.sqlite'), providerMode: 'openai' });
    try {
      const address = runtime.server.address();
      if (!address || typeof address === 'string') throw new Error('Expected TCP address');
      const response = await fetch(`http://127.0.0.1:${address.port}/api/agents/invocation-targets`);
      expect(await response.json()).toEqual({ targets: [] });
    } finally {
      await runtime.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
