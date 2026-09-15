import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Chat, Message } from '../src/core/conversations/conversation';
import type { Workspace } from '../src/core/workspaces/workspace';
import { App } from '../src/app/App';

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function createWorkspaceFetch(initial: Workspace[] = []) {
  let rows = [...initial];
  let workspaceId = rows.length;
  let chatId = 0;
  let messageId = 0;
  let chats: Chat[] = [];
  let messages: Message[] = [];
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://local');
    const method = init?.method ?? 'GET';
    const conversationMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/chats(?:\/([^/]+)(?:\/(messages))?)?$/);
    if (conversationMatch) {
      const [, workspaceIdFromPath, chatIdFromPath, resource] = conversationMatch;
      const workspace = rows.find((row) => row.id === workspaceIdFromPath);
      if (!workspace) return json({ error: 'Workspace not found' }, 404);
      const chat = chatIdFromPath ? chats.find((row) => row.id === chatIdFromPath) : undefined;
      if (chatIdFromPath && (!chat || chat.workspaceId !== workspaceIdFromPath)) return json({ error: 'Chat not found' }, 404);
      if (!chatIdFromPath && !resource && method === 'GET') return json({ chats: chats.filter((row) => row.workspaceId === workspaceIdFromPath) });
      if (!chatIdFromPath && !resource && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as { title?: string };
        const now = new Date(2026, 8, 15, 11, chatId).toISOString();
        const created: Chat = { id: `chat-${++chatId}`, workspaceId: workspaceIdFromPath, title: body.title || 'New chat', status: 'active', createdAt: now, updatedAt: now, schemaVersion: 1 };
        chats = [created, ...chats];
        return json({ chat: created }, 201);
      }
      if (chat && !resource && method === 'GET') return json({ chat });
      if (chat && !resource && method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as { title: string };
        const updated = { ...chat, title: body.title, updatedAt: new Date(2026, 8, 15, 12, chatId).toISOString() };
        chats = chats.map((row) => row.id === updated.id ? updated : row);
        return json({ chat: updated });
      }
      if (chat && resource === 'messages' && method === 'GET') return json({ messages: messages.filter((row) => row.chatId === chat.id) });
      if (chat && resource === 'messages' && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as { content: string };
        const now = new Date(2026, 8, 15, 13, messageId).toISOString();
        const created: Message = { id: `message-${++messageId}`, chatId: chat.id, authorRole: 'user', content: body.content.trim(), createdAt: now, schemaVersion: 1 };
        messages = [...messages, created];
        chats = chats.map((row) => row.id === chat.id ? { ...row, updatedAt: now } : row);
        return json({ message: created }, 201);
      }
      return json({ error: 'Conversation endpoint not found' }, 404);
    }
    if (url.pathname === '/api/workspaces' && method === 'GET') return json({ workspaces: rows });
    if (url.pathname === '/api/workspaces' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { name: string; description?: string };
      const now = new Date(2026, 8, 15, 10, workspaceId).toISOString();
      const workspace: Workspace = { id: `workspace-${++workspaceId}`, name: body.name, description: body.description || null, status: 'active', createdAt: now, updatedAt: now, archivedAt: null, schemaVersion: 1 };
      rows = [workspace, ...rows];
      return json({ workspace }, 201);
    }
    const match = url.pathname.match(/^\/api\/workspaces\/([^/]+)(?:\/(archive|restore))?$/);
    if (!match) return json({ error: 'Not found' }, 404);
    const workspace = rows.find((row) => row.id === match[1]);
    if (!workspace) return json({ error: 'Workspace not found' }, 404);
    const body = init?.body ? JSON.parse(String(init.body)) as Partial<Workspace> : {};
    const next: Workspace = match[2] === 'archive'
      ? { ...workspace, status: 'archived', archivedAt: new Date().toISOString() }
      : match[2] === 'restore'
        ? { ...workspace, status: 'active', archivedAt: null }
        : method === 'PATCH' ? { ...workspace, ...body } : workspace;
    rows = rows.map((row) => row.id === next.id ? next : row);
    return json({ workspace: next });
  });
}

beforeEach(() => vi.stubGlobal('fetch', createWorkspaceFetch()));
afterEach(() => vi.unstubAllGlobals());

describe('AI World Lobby', () => {
  it('renders the Home shell, navigation, and team identities', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /your ai world/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^home$/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /workspaces/i })).toBeDisabled();
    for (const name of ['GPT', 'Gemini', 'Codex']) expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    await screen.findByText(/your first room is waiting/i);
  });

  it('shows an honest intent preview notice instead of executing', async () => {
    render(<App />);
    await screen.findByText(/your first room is waiting/i);
    fireEvent.change(screen.getByRole('textbox', { name: /global intent/i }), { target: { value: 'Plan a garden' } });
    fireEvent.click(screen.getByRole('button', { name: /preview intent entry/i }));
    expect(screen.getByText(/intent execution is not connected yet/i)).toBeInTheDocument();
  });

  it('creates, reloads, opens, renames, closes, archives, and restores a workspace', async () => {
    const persistentFetch = createWorkspaceFetch();
    vi.stubGlobal('fetch', persistentFetch);
    const firstRender = render(<App />);
    await screen.findByText(/your first room is waiting/i);
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /workspace name/i }), { target: { value: 'Garden project' } });
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), { target: { value: 'Plans and field notes' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByRole('heading', { name: 'Garden project' })).toBeInTheDocument();

    firstRender.unmount();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Garden project' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }));
    expect(screen.getByText('Plans and field notes')).toBeInTheDocument();
    await screen.findByText(/start a conversation/i);
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /workspace name/i }), { target: { value: 'Garden studio' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByRole('heading', { name: 'Garden studio' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close workspace/i }));
    fireEvent.click(screen.getByRole('button', { name: /archive/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Garden studio' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByText(/archived workspaces/i));
    fireEvent.click(screen.getByRole('button', { name: /restore & open/i }));
    expect(await screen.findByRole('heading', { name: 'Garden studio' })).toBeInTheDocument();
  });

  it('renders honest empty states and persistence failures', async () => {
    render(<App />);
    expect(screen.getByText(/nothing needs your attention/i)).toBeInTheDocument();
    expect(screen.getByText(/your work will find you here/i)).toBeInTheDocument();
    expect(await screen.findByText(/your first room is waiting/i)).toBeInTheDocument();
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /workspace name/i }), { target: { value: 'Unsaved workspace' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/persistence is unavailable/i);
    expect(screen.queryByText('Unsaved workspace')).not.toBeInTheDocument();
  });

  it('creates a chat, preserves human messages across a UI reload, and never fabricates an AI response', async () => {
    const persistentFetch = createWorkspaceFetch();
    vi.stubGlobal('fetch', persistentFetch);
    const firstRender = render(<App />);
    await screen.findByText(/your first room is waiting/i);
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /workspace name/i }), { target: { value: 'Conversation workspace' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^open$/i }));
    await screen.findByText(/start a conversation/i);
    fireEvent.click(screen.getByRole('button', { name: /new chat/i }));
    expect(await screen.findByRole('heading', { name: 'New chat', level: 1 })).toBeInTheDocument();
    await screen.findByText(/no messages yet/i);
    fireEvent.change(screen.getByRole('textbox', { name: /^message$/i }), { target: { value: 'Keep this human message' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    expect(await screen.findByText('Keep this human message')).toBeInTheDocument();
    expect(screen.queryByText(/AI reply/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to workspace/i }));
    await screen.findByRole('heading', { name: 'New chat' });
    firstRender.unmount();
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^open$/i }));
    await screen.findByRole('heading', { name: 'New chat', level: 3 });
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }));
    expect(await screen.findByRole('heading', { name: 'New chat', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Keep this human message')).toBeInTheDocument();
  });

  it('keeps a message draft and avoids a fake success when chat persistence fails', async () => {
    const durableFetch = createWorkspaceFetch();
    let failMessageWrite = false;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), 'http://local').pathname;
      if (failMessageWrite && init?.method === 'POST' && path.endsWith('/messages')) return Promise.reject(new Error('offline'));
      return durableFetch(input, init);
    }));
    render(<App />);
    await screen.findByText(/your first room is waiting/i);
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /workspace name/i }), { target: { value: 'Failure workspace' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^open$/i }));
    await screen.findByText(/start a conversation/i);
    fireEvent.click(screen.getByRole('button', { name: /new chat/i }));
    await screen.findByText(/no messages yet/i);
    const composer = screen.getByRole('textbox', { name: /^message$/i });
    fireEvent.change(composer, { target: { value: 'Do not lose this draft' } });
    failMessageWrite = true;
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/persistence is unavailable/i);
    expect(composer).toHaveValue('Do not lose this draft');
    expect(screen.queryByText('Do not lose this draft', { selector: 'article p' })).not.toBeInTheDocument();
  });
});
