import { randomUUID } from 'node:crypto';
import type { WorkspaceRepository } from '../workspaces/workspaceRepository.ts';
import {
  CHAT_SCHEMA_VERSION,
  MESSAGE_SCHEMA_VERSION,
  normalizeChatTitle,
  normalizeMessageContent,
  type Chat,
  type Message,
} from '../../core/conversations/conversation.ts';
import type { ConversationRepository } from './conversationRepository.ts';

export class ChatNotFoundError extends Error {
  constructor(id: string) { super(`Chat ${id} was not found.`); this.name = 'ChatNotFoundError'; }
}

export class ChatWorkspaceMismatchError extends Error {
  constructor() { super('This chat does not belong to the selected workspace.'); this.name = 'ChatWorkspaceMismatchError'; }
}

export class ConversationWorkspaceNotFoundError extends Error {
  constructor(id: string) { super(`Workspace ${id} was not found.`); this.name = 'ConversationWorkspaceNotFoundError'; }
}

type ConversationServiceOptions = {
  createId?: () => string;
  now?: () => Date;
};

export class ConversationService {
  private readonly conversations: ConversationRepository;
  private readonly workspaces: WorkspaceRepository;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    conversations: ConversationRepository,
    workspaces: WorkspaceRepository,
    options: ConversationServiceOptions = {},
  ) {
    this.conversations = conversations;
    this.workspaces = workspaces;
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  createChat(workspaceId: string, title = 'New chat'): Chat {
    this.requireWorkspace(workspaceId);
    const timestamp = this.now().toISOString();
    return this.conversations.createChat({
      id: this.createId(),
      workspaceId,
      title: normalizeChatTitle(title),
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: CHAT_SCHEMA_VERSION,
    });
  }

  listChatsForWorkspace(workspaceId: string): Chat[] {
    this.requireWorkspace(workspaceId);
    return this.conversations.listChatsForWorkspace(workspaceId);
  }

  getChat(workspaceId: string, chatId: string): Chat {
    this.requireWorkspace(workspaceId);
    const chat = this.conversations.getChatById(chatId);
    if (!chat) throw new ChatNotFoundError(chatId);
    if (chat.workspaceId !== workspaceId) throw new ChatWorkspaceMismatchError();
    return chat;
  }

  renameChat(workspaceId: string, chatId: string, title: string): Chat {
    const chat = this.getChat(workspaceId, chatId);
    return this.conversations.saveChat({ ...chat, title: normalizeChatTitle(title), updatedAt: this.now().toISOString() });
  }

  addHumanMessage(workspaceId: string, chatId: string, content: string): Message {
    const chat = this.getChat(workspaceId, chatId);
    const message = this.conversations.createMessage({
      id: this.createId(),
      chatId: chat.id,
      authorRole: 'user',
      content: normalizeMessageContent(content),
      createdAt: this.now().toISOString(),
      schemaVersion: MESSAGE_SCHEMA_VERSION,
    });
    this.conversations.saveChat({ ...chat, updatedAt: message.createdAt });
    return message;
  }

  listMessages(workspaceId: string, chatId: string): Message[] {
    this.getChat(workspaceId, chatId);
    return this.conversations.listMessagesForChat(chatId);
  }

  private requireWorkspace(workspaceId: string): void {
    if (!this.workspaces.getById(workspaceId)) throw new ConversationWorkspaceNotFoundError(workspaceId);
  }
}
