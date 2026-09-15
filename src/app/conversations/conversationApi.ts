import type { Chat, Message } from '../../core/conversations/conversation';

type ChatEnvelope = { chat: Chat };
type ChatListEnvelope = { chats: Chat[] };
type MessageEnvelope = { message: Message };
type MessageListEnvelope = { messages: Message[] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  } catch {
    throw new Error('Conversation persistence is unavailable. Check that the local AI Studio runtime is running.');
  }
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'The conversation request failed.');
  return body as T;
}

function chatPath(workspaceId: string, chatId?: string): string {
  const workspace = encodeURIComponent(workspaceId);
  return chatId ? `/api/workspaces/${workspace}/chats/${encodeURIComponent(chatId)}` : `/api/workspaces/${workspace}/chats`;
}

export const conversationApi = {
  async listChats(workspaceId: string): Promise<Chat[]> { return (await request<ChatListEnvelope>(chatPath(workspaceId))).chats; },
  async getChat(workspaceId: string, chatId: string): Promise<Chat> { return (await request<ChatEnvelope>(chatPath(workspaceId, chatId))).chat; },
  async createChat(workspaceId: string, title?: string): Promise<Chat> { return (await request<ChatEnvelope>(chatPath(workspaceId), { method: 'POST', body: JSON.stringify({ title }) })).chat; },
  async renameChat(workspaceId: string, chatId: string, title: string): Promise<Chat> { return (await request<ChatEnvelope>(chatPath(workspaceId, chatId), { method: 'PATCH', body: JSON.stringify({ title }) })).chat; },
  async listMessages(workspaceId: string, chatId: string): Promise<Message[]> { return (await request<MessageListEnvelope>(`${chatPath(workspaceId, chatId)}/messages`)).messages; },
  async addHumanMessage(workspaceId: string, chatId: string, content: string): Promise<Message> { return (await request<MessageEnvelope>(`${chatPath(workspaceId, chatId)}/messages`, { method: 'POST', body: JSON.stringify({ content }) })).message; },
};
