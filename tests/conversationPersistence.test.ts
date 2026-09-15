import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { ConversationService } from '../src/application/conversations/conversationService.ts';
import { SqliteWorkspaceRepository } from '../src/storage/sqlite/sqliteWorkspaceRepository.ts';
import { SqliteConversationRepository } from '../src/storage/sqlite/sqliteConversationRepository.ts';

const temporaryDirectories: string[] = [];
afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

function databasePath(label: string): string {
  const directory = mkdtempSync(join(tmpdir(), `han-ai-studio-${label}-`));
  temporaryDirectories.push(directory);
  return join(directory, 'studio.sqlite');
}

describe('SQLite conversation persistence', () => {
  it('maps persisted schema versions and uses deterministic chat and message ordering', () => {
    const path = databasePath('conversation-mapping');
    const workspaces = new SqliteWorkspaceRepository(path);
    workspaces.create({ id: 'workspace-a', name: 'Workspace A', description: null, status: 'active', createdAt: '2026-09-15T00:00:00.000Z', updatedAt: '2026-09-15T00:00:00.000Z', archivedAt: null, schemaVersion: 1 });
    const conversations = new SqliteConversationRepository(path);
    const timestamp = '2026-09-15T01:00:00.000Z';
    conversations.createChat({ id: 'chat-b', workspaceId: 'workspace-a', title: 'B', status: 'active', createdAt: timestamp, updatedAt: timestamp, schemaVersion: 7 });
    conversations.createChat({ id: 'chat-a', workspaceId: 'workspace-a', title: 'A', status: 'active', createdAt: timestamp, updatedAt: timestamp, schemaVersion: 8 });
    conversations.createMessage({ id: 'message-b', chatId: 'chat-a', authorRole: 'system', content: 'B', createdAt: timestamp, schemaVersion: 9 });
    conversations.createMessage({ id: 'message-a', chatId: 'chat-a', authorRole: 'agent', content: 'A', createdAt: timestamp, schemaVersion: 10 });

    expect(conversations.getChatById('chat-a')).toMatchObject({ schemaVersion: 8, workspaceId: 'workspace-a' });
    expect(conversations.listChatsForWorkspace('workspace-a').map((chat) => chat.id)).toEqual(['chat-a', 'chat-b']);
    expect(conversations.listMessagesForChat('chat-a')).toMatchObject([{ id: 'message-a', schemaVersion: 10 }, { id: 'message-b', schemaVersion: 9 }]);
    conversations.close();
    workspaces.close();
  });

  it('survives a repository restart with its workspace, chat, and human-authored message', () => {
    const path = databasePath('conversation-restart');
    const firstWorkspaces = new SqliteWorkspaceRepository(path);
    firstWorkspaces.create({ id: 'workspace-a', name: 'Workspace A', description: null, status: 'active', createdAt: '2026-09-15T00:00:00.000Z', updatedAt: '2026-09-15T00:00:00.000Z', archivedAt: null, schemaVersion: 1 });
    const firstConversations = new SqliteConversationRepository(path);
    let id = 0;
    const firstService = new ConversationService(firstConversations, firstWorkspaces, { createId: () => `stable-${++id}`, now: () => new Date('2026-09-15T02:00:00.000Z') });
    const chat = firstService.createChat('workspace-a', 'Persistent chat');
    const message = firstService.addHumanMessage('workspace-a', chat.id, 'Persist this message');
    firstConversations.close();
    firstWorkspaces.close();

    const reopenedWorkspaces = new SqliteWorkspaceRepository(path);
    const reopenedConversations = new SqliteConversationRepository(path);
    const reopenedService = new ConversationService(reopenedConversations, reopenedWorkspaces);
    expect(reopenedService.getChat('workspace-a', chat.id)).toMatchObject({ id: chat.id, title: 'Persistent chat' });
    expect(reopenedService.listMessages('workspace-a', chat.id)).toEqual([expect.objectContaining({ id: message.id, authorRole: 'user', content: 'Persist this message' })]);
    reopenedConversations.close();
    reopenedWorkspaces.close();
  });

  it('upgrades a Migration 1 database without modifying its existing workspace row', () => {
    const path = databasePath('migration-one');
    const legacy = new DatabaseSync(path);
    legacy.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations (version, name, applied_at) VALUES (1, 'create_workspaces', '2026-09-15T00:00:00.000Z');
      PRAGMA user_version = 1;
      CREATE TABLE workspaces (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, schema_version INTEGER NOT NULL DEFAULT 1);
      INSERT INTO workspaces VALUES ('legacy-workspace', 'Legacy workspace', 'Kept intact', 'active', '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z', NULL, 1);
    `);
    legacy.close();

    const conversations = new SqliteConversationRepository(path);
    const workspaces = new SqliteWorkspaceRepository(path);
    expect(workspaces.getById('legacy-workspace')).toMatchObject({ name: 'Legacy workspace', description: 'Kept intact' });
    const service = new ConversationService(conversations, workspaces, { createId: () => 'migrated-chat' });
    expect(service.createChat('legacy-workspace')).toMatchObject({ id: 'migrated-chat', workspaceId: 'legacy-workspace' });
    conversations.close();
    workspaces.close();
  });
});
