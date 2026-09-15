import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';

const temporaryDirectories: string[] = [];
afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

async function responseJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { headers: { 'content-type': 'application/json' }, ...init });
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

describe('Conversation HTTP API', () => {
  it('creates workspace-scoped chats and messages, validates writes, isolates scopes, and survives a server restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-ai-studio-conversation-api-'));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, 'studio.sqlite');
    const firstRuntime = await startStudioServer({ host: '127.0.0.1', port: 0, databasePath });
    const firstAddress = firstRuntime.server.address();
    if (!firstAddress || typeof firstAddress === 'string') throw new Error('Expected a TCP test server address.');
    const baseUrl = `http://127.0.0.1:${firstAddress.port}`;

    try {
      const workspaceResponse = await responseJson(`${baseUrl}/api/workspaces`, { method: 'POST', body: JSON.stringify({ name: 'Conversation API workspace' }) });
      expect(workspaceResponse.status).toBe(201);
      const workspace = workspaceResponse.body.workspace as { id: string };
      const chatResponse = await responseJson(`${baseUrl}/api/workspaces/${workspace.id}/chats`, { method: 'POST', body: JSON.stringify({ title: 'API chat' }) });
      expect(chatResponse.status).toBe(201);
      const chat = chatResponse.body.chat as { id: string; workspaceId: string };
      const invalidMessage = await responseJson(`${baseUrl}/api/workspaces/${workspace.id}/chats/${chat.id}/messages`, { method: 'POST', body: JSON.stringify({ content: '   ' }) });
      expect(invalidMessage.status).toBe(400);
      const messageResponse = await responseJson(`${baseUrl}/api/workspaces/${workspace.id}/chats/${chat.id}/messages`, { method: 'POST', body: JSON.stringify({ content: 'Persist through the API' }) });
      expect(messageResponse.status).toBe(201);
      expect(messageResponse.body.message).toMatchObject({ chatId: chat.id, authorRole: 'user', content: 'Persist through the API' });
      const otherWorkspace = await responseJson(`${baseUrl}/api/workspaces`, { method: 'POST', body: JSON.stringify({ name: 'Other workspace' }) });
      const otherWorkspaceId = (otherWorkspace.body.workspace as { id: string }).id;
      expect((await responseJson(`${baseUrl}/api/workspaces/${otherWorkspaceId}/chats/${chat.id}`)).status).toBe(404);
    } finally {
      await firstRuntime.close();
    }

    const reopenedRuntime = await startStudioServer({ host: '127.0.0.1', port: 0, databasePath });
    const reopenedAddress = reopenedRuntime.server.address();
    if (!reopenedAddress || typeof reopenedAddress === 'string') throw new Error('Expected a TCP test server address.');
    try {
      const workspaces = await responseJson(`http://127.0.0.1:${reopenedAddress.port}/api/workspaces`);
      const workspace = (workspaces.body.workspaces as Array<{ id: string; name: string }>).find((item) => item.name === 'Conversation API workspace');
      if (!workspace) throw new Error('Expected the persisted conversation workspace.');
      const chats = await responseJson(`http://127.0.0.1:${reopenedAddress.port}/api/workspaces/${workspace.id}/chats`);
      const chat = (chats.body.chats as Array<{ id: string }>)[0];
      const messages = await responseJson(`http://127.0.0.1:${reopenedAddress.port}/api/workspaces/${workspace.id}/chats/${chat.id}/messages`);
      expect(messages.body.messages).toEqual([expect.objectContaining({ authorRole: 'user', content: 'Persist through the API' })]);
    } finally {
      await reopenedRuntime.close();
    }
  });
});
