import { type FormEvent, useState } from 'react';
import { useChat, useMessages } from './useConversations';

type ChatViewProps = { workspaceId: string; chatId: string; onClose: () => void; };

export function ChatView({ workspaceId, chatId, onClose }: ChatViewProps) {
  const chat = useChat(workspaceId, chatId);
  const messages = useMessages(workspaceId, chatId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated = await chat.rename(title);
    if (updated) setEditing(false);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    const message = await messages.send(draft);
    if (message) setDraft('');
  }

  if (chat.loading) return <p className="loading-state" role="status">Opening chat…</p>;
  if (!chat.chat) return <div className="chat-unavailable"><p role="alert">{chat.error || 'This chat is unavailable.'}</p><button type="button" onClick={onClose}>Back to workspace</button></div>;

  return <section className="chat-view" aria-labelledby="chat-title">
    <div className="workspace-view-nav"><button type="button" onClick={onClose}>← Back to workspace</button><span>Persistent conversation history</span></div>
    <header className="chat-header">
      {editing ? <form onSubmit={rename}><label htmlFor="chat-title-input">Chat title</label><input id="chat-title-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required autoFocus /><button type="submit" disabled={chat.saving}>Save title</button><button type="button" className="quiet-button" onClick={() => setEditing(false)}>Cancel</button></form> : <><div><p className="eyebrow">Chat</p><h1 id="chat-title">{chat.chat.title}</h1><p>Messages stay in this chat. AI replies are not connected yet.</p></div><button type="button" onClick={() => { setTitle(chat.chat?.title ?? ''); setEditing(true); }}>Rename</button></>}
    </header>
    {(chat.error || messages.error) && <div className="workspace-error" role="alert">{chat.error || messages.error}</div>}
    <div className="message-history" aria-label="Message history">
      {messages.loading ? <p className="loading-state" role="status">Loading messages…</p> : messages.messages.length === 0 ? <div className="empty-state chat-empty"><span className="empty-mark" aria-hidden="true">✦</span><div><h2>No messages yet.</h2><p>Your human-authored messages will remain here. This chat does not generate AI responses yet.</p></div></div> : messages.messages.map((message) => <article className={`message message-${message.authorRole}`} key={message.id}><p>{message.content}</p><small>HAN · {new Date(message.createdAt).toLocaleString()}</small></article>)}
    </div>
    <form className="message-composer" onSubmit={send}><label htmlFor="message-content">Message</label><textarea id="message-content" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><div><span>Enter to send · Shift+Enter for a new line</span><button type="submit" disabled={messages.sending || !draft.trim()}>{messages.sending ? 'Sending…' : 'Send'}</button></div></form>
  </section>;
}
