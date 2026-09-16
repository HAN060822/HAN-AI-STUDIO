// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';
import type { AgentInvocationTarget } from '../src/application/agents/agentInvocationService.ts';
import type { CollaborationResult } from '../src/core/collaboration/collaboration.ts';

describe('Collaboration HTTP boundary', () => {
  it.each(['mock', 'none'] as const)('honors %s configuration across server restart without persisting collaboration', async (providerMode) => {
    const directory = mkdtempSync(join(tmpdir(), 'han-collaboration-api-'));
    try {
      for (let restart = 0; restart < 2; restart++) {
        const runtime = await startStudioServer({ port: 0, databasePath: join(directory, 'studio.sqlite'), providerMode });
        try {
          const address = runtime.server.address();
          if (!address || typeof address === 'string') throw new Error('Expected TCP address');
          const base = `http://127.0.0.1:${address.port}`;
          const targets = await (await fetch(`${base}/api/agents/invocation-targets`)).json() as { targets: AgentInvocationTarget[] };
          expect(targets.targets.map((target: { agentId: string }) => target.agentId)).toEqual(providerMode === 'mock' ? ['agent-gpt', 'agent-gemini'] : []);
          const single = await fetch(`${base}/api/agents/agent-gpt/invoke`, { method: 'POST', body: JSON.stringify({ input: 'Single-Agent regression' }) });
          expect(single.status).toBe(providerMode === 'mock' ? 200 : 409);
          for (const collaborationMode of ['sequential', 'review']) {
            const response = await fetch(`${base}/api/collaborations`, { method: 'POST', body: JSON.stringify({ goal: 'HTTP smoke', participantAgentIds: ['agent-gpt', 'agent-gemini'], collaborationMode }) });
            expect(response.status).toBe(200);
            const { result } = await response.json() as { result: CollaborationResult };
            expect(result.status).toBe(providerMode === 'mock' ? 'succeeded' : 'failed');
            expect(result.contributions).toHaveLength(providerMode === 'mock' ? 2 : 0);
            if (providerMode === 'mock') expect(result.finalContribution).toMatchObject({ agentId: 'agent-gemini', mode: 'mock', providerId: 'mock' });
            else expect(result.failure?.code).toBe('agent_unavailable');
          }
          const invalid = await fetch(`${base}/api/collaborations`, { method: 'POST', body: JSON.stringify({ collaborationMode: 'parallel' }) });
          expect(invalid.status).toBe(400);
          expect((await invalid.json() as { code: string }).code).toBe('invalid_mode');
          expect((await fetch(`${base}/api/collaborations`)).status).toBe(405);
          const malformed = await fetch(`${base}/api/collaborations`, { method: 'POST', body: '{' });
          expect(malformed.status).toBe(400);
        } finally { await runtime.close(); }
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
