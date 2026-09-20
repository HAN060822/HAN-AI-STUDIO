import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request as httpRequest } from 'node:http';
import { describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';
import { EnvironmentSecretProvider } from '../src/storage/secrets/environmentSecretProvider.ts';
import type { Knowledge } from '../src/core/knowledge/knowledge.ts';
import type { AuditEvent, PermissionDecision } from '../src/core/governance/governance.ts';

describe('Real HTTP local-owner governance boundary', () => {
  it('blocks unauthorised/cross-origin requests, enforces one reviewed action, preserves audit on restart and exposes no dummy secrets', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-governance-http-')); const vault = join(directory, 'vault');
    mkdirSync(join(vault, '.obsidian'), { recursive: true });
    const dummy = 'DUMMY-stage11-server-only-secret-never-public';
    const options = { port: 0, databasePath: join(directory, 'studio.sqlite'), obsidianVaultRoot: vault, secretProvider: new EnvironmentSecretProvider({ HAN_AI_STUDIO_SECRET_OPENAI: dummy }) };
    let server = await startStudioServer(options);
    function base() { const address = server.server.address(); if (!address || typeof address === 'string') throw new Error(); return `http://127.0.0.1:${address.port}`; }
    async function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
      const response = await fetch(base() + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await response.text(); expect(text).not.toContain(dummy);
      return { status: response.status, body: JSON.parse(text) as { session: string; workspace: { id: string }; record: Knowledge; preview: { token: string; decision: PermissionDecision }; events: AuditEvent[]; code: string; secrets: { ref: string; status: string }[] } };
    }
    try {
      const workspace = (await request('/api/workspaces', 'POST', { name: 'Governance test' })).body.workspace.id;
      const other = (await request('/api/workspaces', 'POST', { name: 'Other scope' })).body.workspace.id;
      const collection = `/api/workspaces/${workspace}/knowledge`;
      const record = (await request(collection, 'POST', { sourceType: 'manual', title: 'Private title not for audit', content: 'Content never copied to audit' })).body.record;
      const path = `${collection}/${record.id}`;
      const preview = (await request(`${path}/preview`)).body.preview;
      expect(preview.decision.status).toBe('approval_required');
      const session = (await request('/api/governance/session')).body.session;
      const trusted = { 'x-han-session': session }; const approved = { approved: true, previewToken: preview.token };
      for (const headers of [{}, { 'x-han-session': 'fake' }, { ...trusted, origin: 'https://attacker.invalid' }, { ...trusted, 'sec-fetch-site': 'cross-site' }] as Record<string, string>[]) expect((await request(`${path}/save`, 'POST', approved, headers)).status).toBe(403);
      expect((await request('/api/governance/session', 'GET', undefined, { origin: 'https://attacker.invalid' })).status).toBe(403);
      // Fetch normalizes Host; a raw local HTTP request exercises the actual rebinding guard.
      const wrongHostStatus = await new Promise<number | undefined>((resolve, reject) => {
        const call = httpRequest(`${base()}/api/governance/session`, { headers: { host: 'attacker.invalid' } }, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
        call.on('error', reject); call.end();
      });
      expect(wrongHostStatus).toBe(403);
      expect((await request(`${path}/save`, 'POST', { previewToken: preview.token }, trusted)).status).toBe(409);
      expect((await request(`${path}/save`, 'POST', { ...approved, actor: { type: 'human', id: 'han-local' } }, trusted)).status).toBe(400);
      expect((await request(`/api/workspaces/${other}/knowledge/${record.id}/audit`)).status).toBe(404);
      expect(existsSync(join(vault, 'Knowledge'))).toBe(false);
      const secretStatus = (await request('/api/governance/secrets')).body.secrets;
      expect(secretStatus).toContainEqual({ ref: 'provider.openai', status: 'configured' });
      expect((await request('/api/governance/secrets/provider.openai')).status).toBe(404);
      const saved = await request(`${path}/save`, 'POST', approved, trusted);
      expect(saved.status).toBe(200); expect(saved.body.record.status).toBe('saved');
      const events = (await request(`${path}/audit`)).body.events;
      expect(events[0]).toMatchObject({ actor: { type: 'human', id: 'han-local' }, intent: { action: 'EXTERNAL', resource: { type: 'knowledge', id: record.id } }, outcome: 'succeeded' });
      expect(events.some((event) => event.outcome === 'not_executed' && event.actor === null)).toBe(true);
      const auditText = JSON.stringify(events);
      for (const forbidden of [record.title, record.content, vault, session, dummy]) expect(auditText).not.toContain(forbidden);
      await server.close(); server = await startStudioServer({ ...options, knowledgePublication: 'deny' });
      expect((await request(`${path}/audit`)).body.events).toEqual(events);
      expect((await request(path)).body.record).toEqual(saved.body.record);
      const deniedPreview = (await request(`${path}/preview`)).body.preview;
      expect(deniedPreview.decision.status).toBe('denied');
      expect((await request(`${path}/save`, 'POST', { approved: true, previewToken: deniedPreview.token }, trusted)).status).toBe(403);
      const newSession = (await request('/api/governance/session')).body.session;
      expect(newSession).not.toBe(session);
      expect((await request(`${path}/save`, 'POST', { approved: true, previewToken: deniedPreview.token }, { 'x-han-session': newSession })).status).toBe(403);
      expect(readdirSync(join(vault, 'Knowledge', 'AI-Studio-Generated'))).toHaveLength(1);
    } finally { await server.close(); rmSync(directory, { recursive: true, force: true }); }
  });
  it('rejects non-loopback deployment rather than pretending a local-owner boundary is remote authentication', async () => {
    await expect(startStudioServer({ host: '0.0.0.0', port: 0, databasePath: 'must-not-be-created.sqlite' })).rejects.toThrow(/loopback/);
    expect(existsSync('must-not-be-created.sqlite')).toBe(false);
  });
});
