import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ConversationRepository } from '../../application/conversations/conversationRepository.ts';
import type { Chat, ChatStatus, Message, MessageAuthorRole } from '../../core/conversations/conversation.ts';
import { applyMigrations } from './migrations.ts';

type ChatRow = {
  id: string;
  workspace_id: string;
  title: string;
  status: ChatStatus;
  created_at: string;
  updated_at: string;
  schema_version: number;
};

type MessageRow = {
  id: string;
  chat_id: string;
  author_role: MessageAuthorRole;
  content: string;
  created_at: string;
  schema_version: number;
};

function chatFromRow(row: ChatRow): Chat {
  return { id: row.id, workspaceId: row.workspace_id, title: row.title, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, schemaVersion: row.schema_version };
}

function messageFromRow(row: MessageRow): Message {
  return { id: row.id, chatId: row.chat_id, authorRole: row.author_role, content: row.content, createdAt: row.created_at, schemaVersion: row.schema_version };
}

export class SqliteConversationRepository implements ConversationRepository {
  readonly databasePath: string;
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    this.databasePath = databasePath;
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    applyMigrations(this.database);
  }

  createChat(chat: Chat): Chat {
    this.database.prepare(`INSERT INTO chats (id, workspace_id, title, status, created_at, updated_at, schema_version)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(chat.id, chat.workspaceId, chat.title, chat.status, chat.createdAt, chat.updatedAt, chat.schemaVersion);
    return chat;
  }

  getChatById(id: string): Chat | null {
    const row = this.database.prepare('SELECT * FROM chats WHERE id = ?').get(id) as ChatRow | undefined;
    return row ? chatFromRow(row) : null;
  }

  listChatsForWorkspace(workspaceId: string): Chat[] {
    return (this.database.prepare('SELECT * FROM chats WHERE workspace_id = ? ORDER BY updated_at DESC, id ASC').all(workspaceId) as ChatRow[]).map(chatFromRow);
  }

  saveChat(chat: Chat): Chat {
    const result = this.database.prepare('UPDATE chats SET title = ?, status = ?, updated_at = ?, schema_version = ? WHERE id = ?')
      .run(chat.title, chat.status, chat.updatedAt, chat.schemaVersion, chat.id);
    if (result.changes !== 1) throw new Error(`Chat ${chat.id} could not be saved.`);
    return chat;
  }

  createMessage(message: Message): Message {
    this.database.prepare(`INSERT INTO messages (id, chat_id, author_role, content, created_at, schema_version)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(message.id, message.chatId, message.authorRole, message.content, message.createdAt, message.schemaVersion);
    return message;
  }

  listMessagesForChat(chatId: string): Message[] {
    return (this.database.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC, id ASC').all(chatId) as MessageRow[]).map(messageFromRow);
  }

  close(): void { this.database.close(); }
}
