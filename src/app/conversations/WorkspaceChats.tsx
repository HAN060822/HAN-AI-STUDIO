import type { Chat } from '../../core/conversations/conversation';
import { useChats } from './useConversations';

type WorkspaceChatsProps = { workspaceId: string; onOpen: (chat: Chat) => void; };

export function WorkspaceChats({ workspaceId, onOpen }: WorkspaceChatsProps) {
  const chats = useChats(workspaceId);
  return <section className="workspace-chats" aria-labelledby="workspace-chats-heading">
    <div className="section-heading"><div><p className="eyebrow">Conversation history</p><h2 id="workspace-chats-heading">Chats</h2></div><button type="button" className="text-button" disabled={chats.saving} onClick={async () => { const chat = await chats.create(); if (chat) onOpen(chat); }}>+ New chat</button></div>
    {chats.error && <div className="workspace-error" role="alert"><span>{chats.error}</span><button type="button" onClick={() => void chats.reload()}>Try again</button></div>}
    {chats.loading ? <p className="loading-state" role="status">Loading chats…</p> : chats.chats.length === 0 ? <div className="empty-state chat-empty"><span className="empty-mark" aria-hidden="true">◌</span><div><h3>Start a conversation.</h3><p>Chats keep your messages together inside this workspace. No AI is connected yet.</p></div></div> : <div className="chat-list">{chats.chats.map((chat) => <article key={chat.id}><span aria-hidden="true">◌</span><div><h3>{chat.title}</h3><p>Updated {new Date(chat.updatedAt).toLocaleString()}</p></div><button type="button" onClick={() => onOpen(chat)}>Open</button></article>)}</div>}
  </section>;
}
