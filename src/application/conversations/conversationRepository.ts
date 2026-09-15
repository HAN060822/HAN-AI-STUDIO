import type { Chat, Message } from '../../core/conversations/conversation.ts';

export interface ConversationRepository {
  createChat(chat: Chat): Chat;
  getChatById(id: string): Chat | null;
  listChatsForWorkspace(workspaceId: string): Chat[];
  saveChat(chat: Chat): Chat;
  createMessage(message: Message): Message;
  listMessagesForChat(chatId: string): Message[];
}
