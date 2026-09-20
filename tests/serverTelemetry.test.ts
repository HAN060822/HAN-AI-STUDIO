import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';
import type { Execution } from '../src/core/executions/execution.ts';
import type { TelemetryRecord } from '../src/core/telemetry/telemetry.ts';

describe('Real scoped telemetry HTTP path', () => {
  it('persists inspectable Mock context/usage across restart without private data, forged scope or cross-origin reads', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-telemetry-http-'));
    const options = { port: 0, databasePath: join(directory, 'studio.sqlite') };
    let server = await startStudioServer(options);
    async function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
      const address = server.server.address(); if (!address || typeof address === 'string') throw new Error();
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() as { workspace: { id: string }; chat: {id: string}; execution: Execution; records: TelemetryRecord[] } };
    }
    try {
      const workspaceId = (await request('/api/workspaces', 'POST', { name: 'Telemetry smoke' })).body.workspace.id;
      const other = (await request('/api/workspaces', 'POST', { name: 'Other private Workspace' })).body.workspace.id;
      const base = `/api/workspaces/${workspaceId}`;
      const privateText = 'DUMMY-PRIVATE-CHAT-KNOWLEDGE-CREDENTIAL';
      const chat = (await request(`${base}/chats`, 'POST', { title: 'Private chat' })).body.chat;
      expect((await request(`${base}/chats/${chat.id}/messages`, 'POST', { content: privateText })).status).toBe(201);
      expect((await request(`${base}/knowledge`, 'POST', { sourceType: 'manual', title: 'Private knowledge', content: privateText })).status).toBe(201);
      const row = (await request(`${base}/executions`, 'POST', { goal: 'Measure this explicit operation only', collaborationMode: 'sequential', participantAgentIds: ['agent-gpt', 'agent-gemini'], workspaceId: other, context: privateText, secret: privateText, hiddenReasoning: privateText })).body.execution;
      const item = `${base}/executions/${row.id}`;
      expect((await request(`${item}/telemetry`)).body.records).toEqual([]);
      await request(`${item}/controls`, 'POST', { action: 'start' });
      let current = row;
      for (let i = 0; i < 100; i++) { current = (await request(item)).body.execution; if (current.status !== 'running') break; await new Promise((resolve) => setTimeout(resolve, 10)); }
      expect(current.status).toBe('completed');
      const events = (await request(`${item}/telemetry`)).body.records;
      expect(events).toHaveLength(4); expect(events.filter((event) => event.phase === 'final').every((event) => event.usage.source === 'synthetic')).toBe(true);
      expect(events.every((event) => event.context.scope?.workspaceId === workspaceId)).toBe(true);
      expect(JSON.stringify(events)).not.toContain(privateText); expect(JSON.stringify(current)).not.toContain(privateText); expect(JSON.stringify(events)).not.toContain(row.plan.goal);
      expect((await request(`/api/workspaces/${other}/executions/${row.id}/telemetry`)).status).toBe(404);
      expect((await request(`${item}/telemetry`, 'GET', undefined, { origin: 'https://attacker.invalid' })).status).toBe(403);
      expect((await request(`${item}/telemetry`, 'POST', {})).status).toBe(405);
      expect((await request(`${base}/executions/missing/telemetry`)).status).toBe(404);
      expect((await request(`${base}/executions/%ZZ/telemetry`)).status).toBe(400);
      await server.close(); server = await startStudioServer(options);
      expect((await request(`${item}/telemetry`)).body.records).toEqual(events);
      expect((await request(item)).body.execution).toEqual(current);
    } finally { await server.close(); rmSync(directory, { recursive: true, force: true }); }
  });
});
