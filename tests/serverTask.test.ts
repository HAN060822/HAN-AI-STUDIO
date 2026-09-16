import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
async function json(url: string, init?: RequestInit) { const response = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init }); return { status: response.status, body: await response.json() as Record<string, unknown> }; }

describe('Task HTTP API', () => {
  it('enforces Task and Chat scope, validates transitions, and persists through runtime restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-task-api-')); directories.push(directory);
    const databasePath = join(directory, 'studio.sqlite');
    const runtime = await startStudioServer({ host: '127.0.0.1', port: 0, databasePath });
    const address = runtime.server.address(); if (!address || typeof address === 'string') throw new Error('Expected TCP address.');
    const base = `http://127.0.0.1:${address.port}`;
    let workspaceId = ''; let chatId = ''; let taskId = '';
    try {
      const workspace = await json(`${base}/api/workspaces`, { method: 'POST', body: JSON.stringify({ name: 'Task API workspace' }) });
      workspaceId = (workspace.body.workspace as { id: string }).id;
      const chat = await json(`${base}/api/workspaces/${workspaceId}/chats`, { method: 'POST', body: JSON.stringify({ title: 'Source Chat' }) });
      chatId = (chat.body.chat as { id: string }).id;
      const task = await json(`${base}/api/workspaces/${workspaceId}/tasks`, { method: 'POST', body: JSON.stringify({ title: 'API Task', goal: 'Persist this Task', sourceChatId: chatId }) });
      expect(task.status).toBe(201); taskId = (task.body.task as { id: string }).id;
      expect(task.body.task).toMatchObject({ workspaceId, sourceChatId: chatId, status: 'draft' });
      expect((await json(`${base}/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status: 'paused' }) })).status).toBe(400);
      expect((await json(`${base}/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ title: 'API Task renamed', goal: 'Updated goal', status: 'discussing' }) })).body.task).toMatchObject({ id: taskId, title: 'API Task renamed', goal: 'Updated goal', status: 'discussing' });
      const other = await json(`${base}/api/workspaces`, { method: 'POST', body: JSON.stringify({ name: 'Other' }) });
      const otherId = (other.body.workspace as { id: string }).id;
      expect((await json(`${base}/api/workspaces/${otherId}/tasks/${taskId}`)).status).toBe(404);
      expect((await json(`${base}/api/workspaces/${otherId}/tasks`, { method: 'POST', body: JSON.stringify({ title: 'Bad link', goal: 'Must fail', sourceChatId: chatId }) })).status).toBe(404);
    } finally { await runtime.close(); }

    const reopened = await startStudioServer({ host: '127.0.0.1', port: 0, databasePath });
    const reopenedAddress = reopened.server.address(); if (!reopenedAddress || typeof reopenedAddress === 'string') throw new Error('Expected TCP address.');
    try {
      const task = await json(`http://127.0.0.1:${reopenedAddress.port}/api/workspaces/${workspaceId}/tasks/${taskId}`);
      expect(task.body.task).toMatchObject({ id: taskId, workspaceId, sourceChatId: chatId, title: 'API Task renamed', goal: 'Updated goal', status: 'discussing' });
    } finally { await reopened.close(); }
  });
});
