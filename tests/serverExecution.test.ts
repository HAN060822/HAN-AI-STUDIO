import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';
import type { Execution } from '../src/core/executions/execution.ts';

describe('Execution HTTP boundary', () => {
  it('creates, controls, observes and resumes durable attempts across full server restart with honest JSON errors', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-execution-http-'));
    const options = { port: 0, databasePath: join(directory, 'studio.sqlite') };
    let server = await startStudioServer(options);
    function base() { const address = server.server.address(); if (!address || typeof address === 'string') throw new Error(); return `http://127.0.0.1:${address.port}`; }
    async function request(path: string, body?: unknown) {
      const response = await fetch(`${base()}${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      expect(response.headers.get('content-type')).toContain('application/json');
      return { status: response.status, body: await response.json() as { workspace: { id: string }; execution: Execution; executions: Execution[]; code: string } };
    }
    try {
      const workspace = (await request('/api/workspaces', { name: 'Execution HTTP' })).body.workspace.id;
      const path = `/api/workspaces/${workspace}/executions`;
      const input = { goal: 'HTTP execution', participantAgentIds: ['agent-gpt', 'agent-gemini'], collaborationMode: 'sequential', pauseAfterStep: true };
      const created = await request(path, input); expect(created.status).toBe(201);
      const id = created.body.execution.id;
      expect((await request(`${path}/${id}/controls`, { action: 'resume' })).status).toBe(409);
      expect((await request(`${path}/${id}/controls`, { action: 'start' })).status).toBe(202);
      expect((await request(`${path}/${id}`)).body.execution.status).toBe('paused');
      await server.close(); server = await startStudioServer(options);
      const checkpoint = (await request(`${path}/${id}`)).body.execution;
      expect(checkpoint).toMatchObject({ status: 'paused', checkpoint: { nextStepIndex: 1 } });
      await request(`${path}/${id}/controls`, { action: 'resume' });
      expect((await request(`${path}/${id}`)).body.execution).toMatchObject({ status: 'completed', checkpoint: { nextStepIndex: 2 } });
      expect((await request(`${path}/${id}/controls`, { action: 'resume' })).status).toBe(409);
      expect((await request(`${path}/${id}/controls`, { action: 'redirect' })).status).toBe(400);
      expect((await request(`/api/workspaces/missing/executions/${id}`)).status).toBe(404);
      const second = (await request(path, input)).body.execution;
      await request(`${path}/${second.id}/controls`, { action: 'start' });
      await request(`${path}/${second.id}/controls`, { action: 'cancel' });
      expect((await request(`${path}/${second.id}`)).body.execution).toMatchObject({ status: 'cancelled', checkpoint: { nextStepIndex: 1 } });
      expect((await request(path)).body.executions).toHaveLength(2);
      const malformed = await fetch(`${base()}${path}`, { method: 'POST', body: '{' });
      expect(malformed.status).toBe(400); expect(malformed.headers.get('content-type')).toContain('application/json');
      expect((await request(`${path}/${id}/controls`, { action: 'pause' })).status).toBe(409);
    } finally { await server.close(); rmSync(directory, { recursive: true, force: true }); }
  });
});
