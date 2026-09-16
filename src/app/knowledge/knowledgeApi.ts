import type { Knowledge } from '../../core/knowledge/knowledge';
import type { KnowledgePreview } from '../../application/knowledge/knowledgeConnector';

export type ReviewPreview = KnowledgePreview & { token: string };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json' } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Knowledge request failed.');
  return body;
}
function base(workspaceId: string) { return `/api/workspaces/${encodeURIComponent(workspaceId)}/knowledge`; }
function item(workspaceId: string, id: string) { return `${base(workspaceId)}/${encodeURIComponent(id)}`; }
export const knowledgeApi = {
  async list(workspaceId: string) { return (await request<{ records: Knowledge[] }>(base(workspaceId))).records; },
  async create(workspaceId: string, input: unknown) { return (await request<{ record: Knowledge }>(base(workspaceId), { method: 'POST', body: JSON.stringify(input) })).record; },
  async get(workspaceId: string, id: string) { return (await request<{ record: Knowledge }>(item(workspaceId, id))).record; },
  async preview(workspaceId: string, id: string) { return (await request<{ preview: ReviewPreview }>(`${item(workspaceId, id)}/preview`)).preview; },
  async save(workspaceId: string, id: string, previewToken: string) { return (await request<{ record: Knowledge }>(`${item(workspaceId, id)}/save`, { method: 'POST', body: JSON.stringify({ approved: true, previewToken }) })).record; },
  async verify(workspaceId: string, id: string) { return (await request<{ verification: { matches: boolean; relativePath: string } }>(`${item(workspaceId, id)}/verify`)).verification; },
};
