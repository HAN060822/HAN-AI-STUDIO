import { describe, expect, it } from 'vitest';
import type { ConversationRepository } from '../src/application/conversations/conversationRepository.ts';
import type { TaskRepository } from '../src/application/tasks/taskRepository.ts';
import { TaskService, TaskSourceChatWorkspaceMismatchError, TaskWorkspaceMismatchError } from '../src/application/tasks/taskService.ts';
import type { WorkspaceRepository } from '../src/application/workspaces/workspaceRepository.ts';
import type { Chat, Message } from '../src/core/conversations/conversation.ts';
import { InvalidTaskTransitionError, type Task } from '../src/core/tasks/task.ts';
import type { Workspace } from '../src/core/workspaces/workspace.ts';

class Workspaces implements WorkspaceRepository {
  constructor(readonly rows: Map<string, Workspace>) {}
  create(value: Workspace) { this.rows.set(value.id, value); return value; }
  getById(id: string) { return this.rows.get(id) ?? null; }
  list() { return [...this.rows.values()]; }
  save(value: Workspace) { this.rows.set(value.id, value); return value; }
}
class Conversations implements ConversationRepository {
  constructor(readonly chats = new Map<string, Chat>()) {}
  createChat(value: Chat) { this.chats.set(value.id, value); return value; }
  getChatById(id: string) { return this.chats.get(id) ?? null; }
  listChatsForWorkspace(workspaceId: string) { return [...this.chats.values()].filter((chat) => chat.workspaceId === workspaceId); }
  saveChat(value: Chat) { this.chats.set(value.id, value); return value; }
  createMessage(value: Message) { return value; }
  listMessagesForChat() { return []; }
}
class Tasks implements TaskRepository {
  rows = new Map<string, Task>();
  create(value: Task) { this.rows.set(value.id, value); return value; }
  getById(id: string) { return this.rows.get(id) ?? null; }
  listForWorkspace(workspaceId: string, sourceChatId?: string) { return [...this.rows.values()].filter((task) => task.workspaceId === workspaceId && (sourceChatId === undefined || task.sourceChatId === sourceChatId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)); }
  save(value: Task) { this.rows.set(value.id, value); return value; }
}
const workspace = (id: string): Workspace => ({ id, name: id, description: null, status: 'active', createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T00:00:00.000Z', archivedAt: null, schemaVersion: 1 });
const chat = (id: string, workspaceId: string): Chat => ({ id, workspaceId, title: id, status: 'active', createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T00:00:00.000Z', schemaVersion: 1 });

describe('Task domain service', () => {
  it('creates and updates a stable workspace Task with an optional same-workspace source Chat', () => {
    const workspaces = new Workspaces(new Map([['workspace-a', workspace('workspace-a')]]));
    const conversations = new Conversations(new Map([['chat-a', chat('chat-a', 'workspace-a')]]));
    let time = 0;
    const service = new TaskService(new Tasks(), workspaces, conversations, { createId: () => 'stable-task', now: () => new Date(1_789_776_000_000 + ++time * 1000) });
    const created = service.createTask('workspace-a', { title: '  First title ', goal: '  Deliver the result ', sourceChatId: 'chat-a' });
    const renamed = service.updateTask('workspace-a', created.id, { title: 'Second title', goal: 'Updated goal' });
    expect(created).toMatchObject({ id: 'stable-task', workspaceId: 'workspace-a', sourceChatId: 'chat-a', status: 'draft', title: 'First title', goal: 'Deliver the result', schemaVersion: 1 });
    expect(renamed).toMatchObject({ id: created.id, title: 'Second title', goal: 'Updated goal' });
    expect(service.listTasksForWorkspace('workspace-a')).toEqual([renamed]);
  });

  it('validates workspace isolation, Chat linkage, transitions, and terminal states', () => {
    const workspaces = new Workspaces(new Map([['workspace-a', workspace('workspace-a')], ['workspace-b', workspace('workspace-b')]]));
    const conversations = new Conversations(new Map([['chat-a', chat('chat-a', 'workspace-a')], ['chat-b', chat('chat-b', 'workspace-b')]]));
    let id = 0;
    const service = new TaskService(new Tasks(), workspaces, conversations, { createId: () => `task-${++id}`, now: () => new Date('2026-09-16T03:00:00.000Z') });
    const task = service.createTask('workspace-a', { title: 'Task', goal: 'Goal' });
    expect(() => service.getTask('workspace-b', task.id)).toThrow(TaskWorkspaceMismatchError);
    expect(() => service.createTask('workspace-a', { title: 'Bad link', goal: 'Goal', sourceChatId: 'chat-b' })).toThrow(TaskSourceChatWorkspaceMismatchError);
    expect(() => service.updateTask('workspace-a', task.id, { status: 'paused' })).toThrow(InvalidTaskTransitionError);
    expect(service.updateTask('workspace-a', task.id, { status: 'discussing' }).status).toBe('discussing');
    expect(service.updateTask('workspace-a', task.id, { status: 'blocked' }).status).toBe('blocked');
    expect(service.updateTask('workspace-a', task.id, { status: 'completed' })).toMatchObject({ status: 'completed', completedAt: '2026-09-16T03:00:00.000Z' });
    expect(() => service.updateTask('workspace-a', task.id, { status: 'discussing' })).toThrow(InvalidTaskTransitionError);
    const cancelled = service.updateTask('workspace-a', service.createTask('workspace-a', { title: 'Cancel', goal: 'Goal' }).id, { status: 'cancelled' });
    expect(cancelled.status).toBe('cancelled');
    expect(() => service.updateTask('workspace-a', cancelled.id, { status: 'completed' })).toThrow(InvalidTaskTransitionError);
  });
});
