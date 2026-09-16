import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';
import type { Knowledge } from '../src/core/knowledge/knowledge.ts';
import type { KnowledgePreview } from '../src/application/knowledge/knowledgeConnector.ts';
import { manualKnowledge } from './knowledgeFixtures.ts';

describe('Knowledge HTTP boundary (temporary vault only)', () => {
  it('validates requests, requires review, reports conflicts honestly, and survives full server restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-knowledge-http-'));
    const vault = join(directory, 'vault'); mkdirSync(join(vault, '.obsidian'), { recursive: true });
    const options = { port: 0, databasePath: join(directory, 'studio.sqlite'), obsidianVaultRoot: vault };
    let server = await startStudioServer(options);
    function base() { const address = server.server.address(); if (!address || typeof address === 'string') throw new Error(); return `http://127.0.0.1:${address.port}`; }
    async function request(path: string, method = 'GET', body?: unknown) {
      const response = await fetch(`${base()}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() as { workspace: { id: string }; record: Knowledge; records: Knowledge[]; preview: KnowledgePreview & { token: string }; verification: { matches: boolean }; code: string } };
    }
    try {
      const workspaceId = (await request('/api/workspaces', 'POST', { name: 'Knowledge HTTP' })).body.workspace.id;
      const path = `/api/workspaces/${workspaceId}/knowledge`;
      expect((await request(path)).body.records).toEqual([]);
      for (const input of [[], null, {}, { ...manualKnowledge, relativePath: '../../outside' }, { sourceType: 'artifact', sourceId: 7 }]) expect((await request(path, 'POST', input)).status).toBe(400);
      const malformed = await fetch(`${base()}${path}`, { method: 'POST', body: '{' }); expect(malformed.status).toBe(400);
      expect((await request('/api/workspaces/%ZZ/knowledge')).status).toBe(400);
      expect((await request(path, 'DELETE')).status).toBe(405);
      const created = await request(path, 'POST', manualKnowledge); expect(created.status).toBe(201);
      const item = `${path}/${created.body.record.id}`;
      expect((await request(`/api/workspaces/missing/knowledge/${created.body.record.id}`)).status).toBe(404);
      const preview = (await request(`${item}/preview`)).body.preview;
      expect(existsSync(join(vault, 'Knowledge'))).toBe(false);
      expect((await request(`${item}/save`, 'POST', { previewToken: preview.token })).status).toBe(400);
      expect((await request(`${item}/save`, 'POST', { approved: true, previewToken: 'old' })).status).toBe(409);
      expect((await request(`${item}/verify`)).status).toBe(409);
      const saved = await request(`${item}/save`, 'POST', { approved: true, previewToken: preview.token });
      expect(saved.status).toBe(200); expect(saved.body.record.status).toBe('saved');
      expect(readFileSync(join(vault, preview.relativePath), 'utf8')).toContain(manualKnowledge.content);
      await server.close(); server = await startStudioServer(options);
      expect((await request(item)).body.record).toEqual(saved.body.record);
      expect((await request(`${item}/verify`)).body.verification.matches).toBe(true);
      const repeat = (await request(`${item}/preview`)).body.preview;
      expect((await request(`${item}/save`, 'POST', { approved: true, previewToken: repeat.token })).body.record).toEqual(saved.body.record);
      expect(readdirSync(join(vault, 'Knowledge', 'AI-Studio-Generated'))).toHaveLength(1);
      const conflict = (await request(path, 'POST', manualKnowledge)).body.record;
      const conflictPath = `${path}/${conflict.id}`;
      const otherPreview = (await request(`${conflictPath}/preview`)).body.preview;
      writeFileSync(join(vault, otherPreview.relativePath), 'Human note');
      const failed = await request(`${conflictPath}/save`, 'POST', { approved: true, previewToken: otherPreview.token });
      expect(failed.status).toBe(503); expect(failed.body.record).toMatchObject({ status: 'failed', savedAt: null, failure: { code: 'note_conflict' } });
      expect(readFileSync(join(vault, otherPreview.relativePath), 'utf8')).toBe('Human note');
      await server.close(); server = await startStudioServer({ ...options, obsidianVaultRoot: undefined });
      expect((await request(conflictPath)).body.record).toEqual(failed.body.record);
      const unavailable = await request(`${conflictPath}/preview`);
      expect(unavailable).toMatchObject({ status: 503, body: { code: 'not_configured' } });
    } finally { await server.close(); rmSync(directory, { recursive: true, force: true }); }
  });
});
