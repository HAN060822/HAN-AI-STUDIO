import type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from '../../core/workspaces/workspace';

type WorkspaceEnvelope = { workspace: Workspace };
type WorkspaceListEnvelope = { workspaces: Workspace[] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('Workspace persistence is unavailable. Check that the local AI Studio runtime is running.');
  }

  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'The workspace request failed.');
  return body as T;
}

export const workspaceApi = {
  async list(): Promise<Workspace[]> {
    return (await request<WorkspaceListEnvelope>('/api/workspaces?includeArchived=true')).workspaces;
  },
  async get(id: string): Promise<Workspace> {
    return (await request<WorkspaceEnvelope>(`/api/workspaces/${encodeURIComponent(id)}`)).workspace;
  },
  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    return (await request<WorkspaceEnvelope>('/api/workspaces', { method: 'POST', body: JSON.stringify(input) })).workspace;
  },
  async update(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    return (await request<WorkspaceEnvelope>(`/api/workspaces/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) })).workspace;
  },
  async archive(id: string): Promise<Workspace> {
    return (await request<WorkspaceEnvelope>(`/api/workspaces/${encodeURIComponent(id)}/archive`, { method: 'POST' })).workspace;
  },
  async restore(id: string): Promise<Workspace> {
    return (await request<WorkspaceEnvelope>(`/api/workspaces/${encodeURIComponent(id)}/restore`, { method: 'POST' })).workspace;
  },
};
