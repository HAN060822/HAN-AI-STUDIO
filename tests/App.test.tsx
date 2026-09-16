import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Chat, Message } from '../src/core/conversations/conversation';
import type { Task } from '../src/core/tasks/task';
import type { Workspace } from '../src/core/workspaces/workspace';
import { App } from '../src/app/App';
import { initialAgentRegistry } from '../src/application/agents/initialAgentRegistry';

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function createWorkspaceFetch(initial: Workspace[] = [], initialTasks: Task[] = []) {
  let rows = [...initial];
  let workspaceId = rows.length;
  let chatId = 0;
  let messageId = 0;
  let taskId = initialTasks.length;
  let chats: Chat[] = [];
  let messages: Message[] = [];
  let tasks: Task[] = [...initialTasks];
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://local');
    const method = init?.method ?? 'GET';
    if (url.pathname.endsWith('/executions') && method === 'GET') return json({ executions: [] });
    if (url.pathname === '/api/agents/invocation-targets' && method === 'GET') return json({ targets: [{ agentId: 'agent-gpt', displayName: 'GPT', backendMode: 'mock', providerId: 'mock', modelId: 'mock-basic' }] });
    if (url.pathname === '/api/agents/agent-gpt/invoke' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { input: string };
      return json({ result: { agentId: 'agent-gpt', agentDisplayName: 'GPT', providerId: 'mock', modelId: 'mock-basic', mode: 'mock', status: 'succeeded', output: `[MOCK response for agent-gpt] ${body.input}` } });
    }
    const taskMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/tasks(?:\/([^/]+))?$/);
    if (taskMatch) {
      const [, workspaceIdFromPath, taskIdFromPath] = taskMatch;
      const workspace = rows.find((row) => row.id === workspaceIdFromPath);
      if (!workspace) return json({ error: 'Workspace not found' }, 404);
      const task = taskIdFromPath ? tasks.find((row) => row.id === taskIdFromPath) : undefined;
      if (taskIdFromPath && (!task || task.workspaceId !== workspaceIdFromPath)) return json({ error: 'Task not found' }, 404);
      if (!taskIdFromPath && method === 'GET') {
        const sourceChatId = url.searchParams.get('sourceChatId');
        return json({ tasks: tasks.filter((row) => row.workspaceId === workspaceIdFromPath && (!sourceChatId || row.sourceChatId === sourceChatId)) });
      }
      if (!taskIdFromPath && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as { title: string; goal: string; sourceChatId?: string };
        const now = new Date(2026, 8, 15, 14, taskId).toISOString();
        const created: Task = { id: `task-${++taskId}`, workspaceId: workspaceIdFromPath, sourceChatId: body.sourceChatId ?? null, title: body.title.trim(), goal: body.goal.trim(), status: 'draft', createdAt: now, updatedAt: now, completedAt: null, schemaVersion: 1 };
        tasks = [created, ...tasks];
        return json({ task: created }, 201);
      }
      if (task && method === 'GET') return json({ task });
      if (task && method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as Partial<Task>;
        const now = new Date(2026, 8, 15, 15, taskId).toISOString();
        const updated: Task = { ...task, ...body, updatedAt: now, completedAt: body.status === 'completed' ? now : task.completedAt };
        tasks = tasks.map((row) => row.id === updated.id ? updated : row);
        return json({ task: updated });
      }
      return json({ error: 'Task endpoint not found' }, 404);
    }
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
    for (const agent of initialAgentRegistry.list()) {
      const heading = screen.getByRole('heading', { name: agent.displayName });
      expect(heading).toBeInTheDocument();
      expect(heading.closest('article')).toHaveAttribute('data-agent-id', agent.id);
    }
    expect(screen.getAllByText('Unavailable')).toHaveLength(3);
    expect(screen.getByText(/providers not connected/i)).toBeInTheDocument();
    expect(screen.queryByText(/thinking|researching|building|reviewing|working/i)).not.toBeInTheDocument();
    await screen.findByText(/your first room is waiting/i);
  });

  it('shows an honest intent preview notice instead of executing', async () => {
    render(<App />);
    await screen.findByText(/your first room is waiting/i);
    fireEvent.change(screen.getByRole('textbox', { name: /global intent/i }), { target: { value: 'Plan a garden' } });
    fireEvent.click(screen.getByRole('button', { name: /preview intent entry/i }));
    expect(screen.getByText(/intent execution is not connected yet/i)).toBeInTheDocument();
  });

  it('invokes the configured test Agent and labels normalized Mock output', async () => {
    render(<App />);
    expect(await screen.findByRole('option', { name: /gpt · mock test backend/i })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /^message$/i }), { target: { value: 'Boundary proof' } });
    fireEvent.click(screen.getByRole('button', { name: /invoke test agent/i }));
    const result = await screen.findByRole('article', { name: /mock provider result/i });
    expect(within(result).getByText(/mock · test output/i)).toBeInTheDocument();
    expect(within(result).getByText('[MOCK response for agent-gpt] Boundary proof')).toBeInTheDocument();
    expect(within(result).getByText(/Provider mock · Model mock-basic · succeeded/i)).toBeInTheDocument();
  });

  it('shows a visible retryable error when invocation targets cannot load', async () => {
    const workingFetch = createWorkspaceFetch();
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (new URL(String(input), 'http://local').pathname === '/api/agents/invocation-targets') return Promise.reject(new Error('stale server'));
      return workingFetch(input, init);
    }));
    render(<App />);
    expect(await within(screen.getByLabelText('Agent Invocation')).findByRole('alert')).toHaveTextContent(/mock test backend could not be loaded/i);
    expect(await within(screen.getByRole('region', { name: 'Prototype Collaboration' })).findByRole('alert')).toHaveTextContent(/collaboration test Agents could not be loaded/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
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

  it('creates, edits, transitions, reloads, and links persistent Tasks without pretending to execute them', async () => {
    const persistentFetch = createWorkspaceFetch();
    vi.stubGlobal('fetch', persistentFetch);
    const firstRender = render(<App />);
    await screen.findByText(/your first room is waiting/i);
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /workspace name/i }), { target: { value: 'Task workspace' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^open$/i }));
    await screen.findByText(/no active tasks/i);
    fireEvent.click(screen.getByRole('button', { name: /new task/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /^task title$/i }), { target: { value: 'Stage 4 persistence test' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^goal$/i }), { target: { value: 'Verify persistent Task state.' } });
    fireEvent.click(screen.getByRole('button', { name: /^create task$/i }));
    const taskHeading = await screen.findByRole('heading', { name: 'Stage 4 persistence test', level: 2 });
    const panel = taskHeading.closest('section');
    if (!panel) throw new Error('Expected Task panel.');
    expect(within(panel).getByText('Verify persistent Task state.')).toBeInTheDocument();
    expect(within(panel).getByText(/execution is not connected/i)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: /discussing/i }));
    await waitFor(() => expect(within(panel).getByText('Discussing', { selector: 'dd' })).toBeInTheDocument());
    fireEvent.click(within(panel).getByRole('button', { name: /^edit$/i }));
    fireEvent.change(within(panel).getByRole('textbox', { name: /^task title$/i }), { target: { value: 'Persistent Task renamed' } });
    fireEvent.change(within(panel).getByRole('textbox', { name: /^goal$/i }), { target: { value: 'Updated durable goal.' } });
    fireEvent.click(within(panel).getByRole('button', { name: /save task/i }));
    expect(await within(panel).findByRole('heading', { name: 'Persistent Task renamed' })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: /back to tasks/i }));
    expect(await screen.findByRole('heading', { name: 'Persistent Task renamed', level: 3 })).toBeInTheDocument();

    await screen.findByText(/start a conversation/i);
    fireEvent.click(screen.getByRole('button', { name: /new chat/i }));
    await screen.findByText(/no active task is linked to this chat/i);
    fireEvent.click(screen.getByRole('button', { name: /task from chat/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /^task title$/i }), { target: { value: 'Chat-related Task' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^goal$/i }), { target: { value: 'Keep discussion and work distinct.' } });
    fireEvent.click(screen.getByRole('button', { name: /create related task/i }));
    const relatedHeading = await screen.findByRole('heading', { name: 'Chat-related Task', level: 2 });
    const relatedPanel = relatedHeading.closest('section');
    if (!relatedPanel) throw new Error('Expected related Task panel.');
    expect(within(relatedPanel).getByText('chat-1')).toBeInTheDocument();

    firstRender.unmount();
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^open$/i }));
    expect(await screen.findByRole('heading', { name: 'Persistent Task renamed', level: 3 })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^open$/i })[1]);
    expect(await screen.findByText('Updated durable goal.')).toBeInTheDocument();
    expect(screen.getByText('Discussing', { selector: 'dd' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^completed$/i }));
    expect(await screen.findByRole('heading', { name: /tasks · 1 active/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Persistent Task renamed' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /closed 1/i }));
    expect(await screen.findByRole('heading', { name: 'Persistent Task renamed', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('separates a large compact Task collection into bounded Active and Closed views across refresh', async () => {
    const workspace: Workspace = { id: 'workspace-scale', name: 'Scale workspace', description: null, status: 'active', createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T00:00:00.000Z', archivedAt: null, schemaVersion: 1 };
    const statuses: Task['status'][] = ['draft', 'discussing', 'paused', 'blocked', 'draft', 'discussing', 'paused', 'blocked', 'draft', 'discussing', 'completed', 'cancelled'];
    const seededTasks: Task[] = statuses.map((status, index) => ({ id: `seed-task-${String(index).padStart(2, '0')}`, workspaceId: workspace.id, sourceChatId: null, title: `${status} Task ${index + 1}`, goal: `Detailed goal ${index + 1} belongs in the Task detail view.`, status, createdAt: `2026-09-16T00:${String(index).padStart(2, '0')}:00.000Z`, updatedAt: `2026-09-16T00:${String(index).padStart(2, '0')}:00.000Z`, completedAt: status === 'completed' ? '2026-09-16T01:00:00.000Z' : null, schemaVersion: 1 }));
    const persistentFetch = createWorkspaceFetch([workspace], seededTasks);
    vi.stubGlobal('fetch', persistentFetch);
    const firstRender = render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^open$/i }));
    expect(await screen.findByRole('heading', { name: /tasks · 10 active/i })).toBeInTheDocument();
    const activeList = screen.getByLabelText('Active Tasks');
    expect(within(activeList).getAllByRole('article')).toHaveLength(10);
    expect(within(activeList).queryByText(/Detailed goal/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'completed Task 11' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /closed 2/i }));
    const closedList = await screen.findByLabelText('Closed Tasks');
    expect(within(closedList).getByRole('heading', { name: 'completed Task 11' })).toBeInTheDocument();
    expect(within(closedList).getByRole('heading', { name: 'cancelled Task 12' })).toBeInTheDocument();
    expect(within(closedList).getAllByRole('article')).toHaveLength(2);

    firstRender.unmount();
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^open$/i }));
    expect(await screen.findByRole('heading', { name: /tasks · 10 active/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /closed 2/i }));
    expect(await screen.findByRole('heading', { name: 'cancelled Task 12' })).toBeInTheDocument();
  });
});
