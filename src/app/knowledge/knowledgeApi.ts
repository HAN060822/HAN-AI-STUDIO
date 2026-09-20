import type { Knowledge } from '../../core/knowledge/knowledge';
import type { KnowledgePreview } from '../../application/knowledge/knowledgeConnector';
import type { AuditEvent, PermissionDecision } from '../../core/governance/governance';
import type { SecretStatus } from '../../core/secrets/secret';

export type ReviewPreview = KnowledgePreview & { token: string; decision: PermissionDecision };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
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
  async save(workspaceId: string, id: string, previewToken: string) {
    // Fresh process-local owner/CSRF context; never put provider secrets in this request.
    const { session } = await request<{ session: string }>('/api/governance/session');
    return (await request<{ record: Knowledge }>(`${item(workspaceId, id)}/save`, { method: 'POST', headers: { 'x-han-session': session }, body: JSON.stringify({ approved: true, previewToken }) })).record;
  },
  async verify(workspaceId: string, id: string) { return (await request<{ verification: { matches: boolean; relativePath: string } }>(`${item(workspaceId, id)}/verify`)).verification; },
  async audit(workspaceId: string, id: string) { return (await request<{ events: AuditEvent[] }>(`${item(workspaceId, id)}/audit`)).events; },
  async secretStatus() { return (await request<{ secrets: SecretStatus[] }>('/api/governance/secrets')).secrets; },
};
