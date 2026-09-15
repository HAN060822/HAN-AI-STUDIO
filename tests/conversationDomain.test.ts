import { describe, expect, it } from 'vitest';
import type { ConversationRepository } from '../src/application/conversations/conversationRepository.ts';
import { ChatWorkspaceMismatchError, ConversationService } from '../src/application/conversations/conversationService.ts';
import type { WorkspaceRepository } from '../src/application/workspaces/workspaceRepository.ts';
import type { Chat, Message } from '../src/core/conversations/conversation.ts';
import type { Workspace } from '../src/core/workspaces/workspace.ts';

class MemoryWorkspaceRepository implements WorkspaceRepository {
  constructor(readonly rows = new Map<string, Workspace>()) {}
  create(workspace: Workspace) { this.rows.set(workspace.id, workspace); return workspace; }
  getById(id: string) { return this.rows.get(id) ?? null; }
  list(includeArchived: boolean) { return [...this.rows.values()].filter((workspace) => includeArchived || workspace.status === 'active'); }
  save(workspace: Workspace) { this.rows.set(workspace.id, workspace); return workspace; }
}

class MemoryConversationRepository implements ConversationRepository {
  chats = new Map<string, Chat>();
  messages = new Map<string, Message>();
  createChat(chat: Chat) { this.chats.set(chat.id, chat); return chat; }
  getChatById(id: string) { return this.chats.get(id) ?? null; }
  listChatsForWorkspace(workspaceId: string) { return [...this.chats.values()].filter((chat) => chat.workspaceId === workspaceId).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)); }
  saveChat(chat: Chat) { this.chats.set(chat.id, chat); return chat; }
  createMessage(message: Message) { this.messages.set(message.id, message); return message; }
  listMessagesForChat(chatId: string) { return [...this.messages.values()].filter((message) => message.chatId === chatId).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)); }
}

function workspace(id: string): Workspace {
  return { id, name: id, description: null, status: 'active', createdAt: '2026-09-15T00:00:00.000Z', updatedAt: '2026-09-15T00:00:00.000Z', archivedAt: null, schemaVersion: 1 };
}

describe('Conversation domain service', () => {
  it('creates, renames, and orders workspace-scoped chats with typed human messages', () => {
    const workspaces = new MemoryWorkspaceRepository(new Map([['workspace-a', workspace('workspace-a')]]));
    const conversations = new MemoryConversationRepository();
    let id = 0;
    let time = 0;
    const service = new ConversationService(conversations, workspaces, {
      createId: () => `id-${++id}`,
      now: () => new Date(1_789_689_600_000 + ++time * 1000),
    });

    const first = service.createChat('workspace-a', '  Planning  ');
    const second = service.createChat('workspace-a', 'Research');
    const renamed = service.renameChat('workspace-a', first.id, 'Garden plan');
    const message = service.addHumanMessage('workspace-a', first.id, '  Plant native herbs  ');

    expect(renamed).toMatchObject({ id: first.id, workspaceId: 'workspace-a', title: 'Garden plan', status: 'active', schemaVersion: 1 });
    expect(service.listChatsForWorkspace('workspace-a').map((chat) => chat.id)).toEqual([first.id, second.id]);
    expect(message).toMatchObject({ chatId: first.id, authorRole: 'user', content: 'Plant native herbs', schemaVersion: 1 });
    expect(service.listMessages('workspace-a', first.id)).toEqual([message]);
  });

  it('rejects empty messages and cross-workspace chat access', () => {
    const workspaces = new MemoryWorkspaceRepository(new Map([['workspace-a', workspace('workspace-a')], ['workspace-b', workspace('workspace-b')]]));
    const service = new ConversationService(new MemoryConversationRepository(), workspaces, { createId: () => 'chat-a' });
    const chat = service.createChat('workspace-a');

    expect(() => service.addHumanMessage('workspace-a', chat.id, '   ')).toThrow('Message content is required.');
    expect(() => service.getChat('workspace-b', chat.id)).toThrow(ChatWorkspaceMismatchError);
  });
});
