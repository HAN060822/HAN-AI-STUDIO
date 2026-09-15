import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Workspace } from '../src/core/workspaces/workspace';
import { App } from '../src/app/App';

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function createWorkspaceFetch(initial: Workspace[] = []) {
  let rows = [...initial];
  let id = rows.length;
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://local');
    const method = init?.method ?? 'GET';
    if (url.pathname === '/api/workspaces' && method === 'GET') return json({ workspaces: rows });
    if (url.pathname === '/api/workspaces' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { name: string; description?: string };
      const now = new Date(2026, 8, 15, 10, id).toISOString();
      const workspace: Workspace = { id: `workspace-${++id}`, name: body.name, description: body.description || null, status: 'active', createdAt: now, updatedAt: now, archivedAt: null, schemaVersion: 1 };
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
  it('renders the Home shell, navigation, and team identities', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /your ai world/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^home$/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /workspaces/i })).toBeDisabled();
    for (const name of ['GPT', 'Gemini', 'Codex']) expect(screen.getByRole('heading', { name })).toBeInTheDocument();
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
});
