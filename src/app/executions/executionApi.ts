import type { CollaborationRequest } from '../../core/collaboration/collaboration';
import type { Execution, ExecutionAction } from '../../core/executions/execution';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json' } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Execution request failed.');
  return body;
}
function path(workspaceId: string) { return `/api/workspaces/${encodeURIComponent(workspaceId)}/executions`; }
export const executionApi = {
  async list(workspaceId: string): Promise<Execution[]> { return (await request<{ executions: Execution[] }>(path(workspaceId))).executions; },
  async create(workspaceId: string, input: CollaborationRequest & { taskId: string | null; pauseAfterStep: boolean }): Promise<Execution> {
    return (await request<{ execution: Execution }>(path(workspaceId), { method: 'POST', body: JSON.stringify(input) })).execution;
  },
  async control(workspaceId: string, id: string, action: ExecutionAction): Promise<Execution> {
    return (await request<{ execution: Execution }>(`${path(workspaceId)}/${encodeURIComponent(id)}/controls`, { method: 'POST', body: JSON.stringify({ action }) })).execution;
  },
};
