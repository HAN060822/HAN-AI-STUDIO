import type { Artifact, CreateArtifactInput } from '../../core/outcomes/artifact';
import type { TaskReport } from '../../core/outcomes/taskReport';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json' } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Outcome request failed.');
  return body;
}
function base(workspaceId: string) { return `/api/workspaces/${encodeURIComponent(workspaceId)}`; }
export const outcomeApi = {
  async listArtifacts(workspaceId: string): Promise<Artifact[]> { return (await request<{ artifacts: Artifact[] }>(`${base(workspaceId)}/artifacts`)).artifacts; },
  async createArtifact(workspaceId: string, input: CreateArtifactInput): Promise<Artifact> {
    return (await request<{ artifact: Artifact }>(`${base(workspaceId)}/artifacts`, { method: 'POST', body: JSON.stringify(input) })).artifact;
  },
  async listReports(workspaceId: string): Promise<TaskReport[]> { return (await request<{ reports: TaskReport[] }>(`${base(workspaceId)}/task-reports`)).reports; },
  async generateReport(workspaceId: string, taskId: string): Promise<TaskReport> {
    return (await request<{ report: TaskReport }>(`${base(workspaceId)}/task-reports`, { method: 'POST', body: JSON.stringify({ taskId }) })).report;
  },
};
