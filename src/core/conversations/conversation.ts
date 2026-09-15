export const CHAT_SCHEMA_VERSION = 1 as const;
export const MESSAGE_SCHEMA_VERSION = 1 as const;

export type ChatStatus = 'active';
export type MessageAuthorRole = 'user' | 'agent' | 'system';

export type Chat = {
  id: string;
  workspaceId: string;
  title: string;
  status: ChatStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
};

export type Message = {
  id: string;
  chatId: string;
  authorRole: MessageAuthorRole;
  content: string;
  createdAt: string;
  schemaVersion: number;
};

export class ConversationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversationValidationError';
  }
}

export function normalizeChatTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized) throw new ConversationValidationError('Chat title is required.');
  if (normalized.length > 160) throw new ConversationValidationError('Chat title must be 160 characters or fewer.');
  return normalized;
}

export function normalizeMessageContent(content: string): string {
  const normalized = content.trim();
  if (!normalized) throw new ConversationValidationError('Message content is required.');
  if (normalized.length > 20_000) throw new ConversationValidationError('Message content must be 20,000 characters or fewer.');
  return normalized;
}
