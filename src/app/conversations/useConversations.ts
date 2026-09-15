import { useCallback, useEffect, useState } from 'react';
import type { Chat, Message } from '../../core/conversations/conversation';
import { conversationApi } from './conversationApi';

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useChats(workspaceId: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setChats(await conversationApi.listChats(workspaceId)); } catch (loadError) { setError(messageFor(loadError, 'Chats could not be loaded.')); } finally { setLoading(false); }
  }, [workspaceId]);
  useEffect(() => { void reload(); }, [reload]);
  const create = useCallback(async () => {
    setSaving(true); setError('');
    try { const chat = await conversationApi.createChat(workspaceId); setChats((current) => [chat, ...current]); return chat; } catch (createError) { setError(messageFor(createError, 'The chat could not be created.')); return null; } finally { setSaving(false); }
  }, [workspaceId]);
  return { chats, loading, saving, error, reload, create };
}

export function useChat(workspaceId: string, chatId: string) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setChat(await conversationApi.getChat(workspaceId, chatId)); } catch (loadError) { setError(messageFor(loadError, 'The chat could not be loaded.')); } finally { setLoading(false); }
  }, [workspaceId, chatId]);
  useEffect(() => { void reload(); }, [reload]);
  const rename = useCallback(async (title: string) => {
    setSaving(true); setError('');
    try { const updated = await conversationApi.renameChat(workspaceId, chatId, title); setChat(updated); return updated; } catch (renameError) { setError(messageFor(renameError, 'The chat could not be renamed.')); return null; } finally { setSaving(false); }
  }, [workspaceId, chatId]);
  return { chat, loading, saving, error, rename, reload };
}

export function useMessages(workspaceId: string, chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setMessages(await conversationApi.listMessages(workspaceId, chatId)); } catch (loadError) { setError(messageFor(loadError, 'Message history could not be loaded.')); } finally { setLoading(false); }
  }, [workspaceId, chatId]);
  useEffect(() => { void reload(); }, [reload]);
  const send = useCallback(async (content: string) => {
    setSending(true); setError('');
    try { const message = await conversationApi.addHumanMessage(workspaceId, chatId, content); setMessages((current) => [...current, message]); return message; } catch (sendError) { setError(messageFor(sendError, 'The message could not be saved.')); return null; } finally { setSending(false); }
  }, [workspaceId, chatId]);
  return { messages, loading, sending, error, send, reload };
}
