import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { TaskService } from '../src/application/tasks/taskService.ts';
import { SqliteConversationRepository } from '../src/storage/sqlite/sqliteConversationRepository.ts';
import { SqliteTaskRepository } from '../src/storage/sqlite/sqliteTaskRepository.ts';
import { SqliteWorkspaceRepository } from '../src/storage/sqlite/sqliteWorkspaceRepository.ts';

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
function pathFor(label: string) { const directory = mkdtempSync(join(tmpdir(), `han-task-${label}-`)); directories.push(directory); return join(directory, 'studio.sqlite'); }
const workspace = { id: 'workspace-a', name: 'Workspace A', description: null, status: 'active' as const, createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T00:00:00.000Z', archivedAt: null, schemaVersion: 1 };

describe('SQLite Task persistence', () => {
  it('preserves schema versions, workspace scope, and deterministic ordering', () => {
    const path = pathFor('mapping');
    const workspaces = new SqliteWorkspaceRepository(path); workspaces.create(workspace);
    const tasks = new SqliteTaskRepository(path);
    const stamp = '2026-09-16T01:00:00.000Z';
    tasks.create({ id: 'task-b', workspaceId: workspace.id, sourceChatId: null, title: 'B', goal: 'B', status: 'draft', createdAt: stamp, updatedAt: stamp, completedAt: null, schemaVersion: 7 });
    tasks.create({ id: 'task-a', workspaceId: workspace.id, sourceChatId: null, title: 'A', goal: 'A', status: 'draft', createdAt: stamp, updatedAt: stamp, completedAt: null, schemaVersion: 8 });
    expect(tasks.listForWorkspace(workspace.id).map((task) => [task.id, task.schemaVersion])).toEqual([['task-a', 8], ['task-b', 7]]);
    tasks.close(); workspaces.close();
  });

  it('keeps Task identity, content, lifecycle, and Chat relation across repository restart', () => {
    const path = pathFor('restart');
    const workspaces = new SqliteWorkspaceRepository(path); workspaces.create(workspace);
    const conversations = new SqliteConversationRepository(path);
    conversations.createChat({ id: 'chat-a', workspaceId: workspace.id, title: 'Source', status: 'active', createdAt: workspace.createdAt, updatedAt: workspace.updatedAt, schemaVersion: 1 });
    const tasks = new SqliteTaskRepository(path);
    let id = 0;
    const service = new TaskService(tasks, workspaces, conversations, { createId: () => `stable-task-${++id}`, now: () => new Date('2026-09-16T02:00:00.000Z') });
    const created = service.createTask(workspace.id, { title: 'Persistent Task', goal: 'Remain durable', sourceChatId: 'chat-a' });
    service.updateTask(workspace.id, created.id, { status: 'discussing' });
    const completed = service.createTask(workspace.id, { title: 'Completed history', goal: 'Retain completed work', sourceChatId: 'chat-a' });
    service.updateTask(workspace.id, completed.id, { status: 'completed' });
    const cancelled = service.createTask(workspace.id, { title: 'Cancelled history', goal: 'Retain abandoned work', sourceChatId: 'chat-a' });
    service.updateTask(workspace.id, cancelled.id, { status: 'cancelled' });
    tasks.close(); conversations.close(); workspaces.close();
    const reopenedWorkspaces = new SqliteWorkspaceRepository(path);
    const reopenedConversations = new SqliteConversationRepository(path);
    const reopenedTasks = new SqliteTaskRepository(path);
    const reopenedService = new TaskService(reopenedTasks, reopenedWorkspaces, reopenedConversations);
    const reopened = reopenedService.getTask(workspace.id, created.id);
    expect(reopened).toMatchObject({ id: 'stable-task-1', title: 'Persistent Task', goal: 'Remain durable', status: 'discussing', workspaceId: workspace.id, sourceChatId: 'chat-a' });
    expect(reopenedService.getTask(workspace.id, completed.id)).toMatchObject({ id: completed.id, title: 'Completed history', goal: 'Retain completed work', status: 'completed', workspaceId: workspace.id, sourceChatId: 'chat-a', completedAt: '2026-09-16T02:00:00.000Z' });
    expect(reopenedService.getTask(workspace.id, cancelled.id)).toMatchObject({ id: cancelled.id, title: 'Cancelled history', goal: 'Retain abandoned work', status: 'cancelled', workspaceId: workspace.id, sourceChatId: 'chat-a' });
    reopenedTasks.close(); reopenedConversations.close(); reopenedWorkspaces.close();
  });

  it('applies Migration 3 to a Migration 2 database without losing Workspace, Chat, or Message data', () => {
    const path = pathFor('migration-three');
    const legacy = new DatabaseSync(path);
    legacy.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations VALUES (1, 'create_workspaces', '2026-09-15T00:00:00.000Z');
      INSERT INTO schema_migrations VALUES (2, 'create_chats_and_messages', '2026-09-15T01:00:00.000Z');
      PRAGMA user_version = 2;
      CREATE TABLE workspaces (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, schema_version INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE chats (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, schema_version INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT);
      CREATE TABLE messages (id TEXT PRIMARY KEY NOT NULL, chat_id TEXT NOT NULL, author_role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, schema_version INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE RESTRICT);
      INSERT INTO workspaces VALUES ('legacy-workspace', 'Legacy', NULL, 'active', '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z', NULL, 1);
      INSERT INTO chats VALUES ('legacy-chat', 'legacy-workspace', 'Legacy Chat', 'active', '2026-09-15T01:00:00.000Z', '2026-09-15T01:00:00.000Z', 1);
      INSERT INTO messages VALUES ('legacy-message', 'legacy-chat', 'user', 'Keep me', '2026-09-15T01:01:00.000Z', 1);
    `);
    legacy.close();
    const tasks = new SqliteTaskRepository(path);
    const workspaces = new SqliteWorkspaceRepository(path);
    const conversations = new SqliteConversationRepository(path);
    expect(workspaces.getById('legacy-workspace')?.name).toBe('Legacy');
    expect(conversations.getChatById('legacy-chat')?.title).toBe('Legacy Chat');
    expect(conversations.listMessagesForChat('legacy-chat')[0].content).toBe('Keep me');
    const versions = new DatabaseSync(path); expect(versions.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6]); versions.close();
    tasks.close(); conversations.close(); workspaces.close();
  });
});
