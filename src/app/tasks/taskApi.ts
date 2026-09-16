import type { Task, TaskStatus } from '../../core/tasks/task';

type TaskEnvelope = { task: Task };
type TaskListEnvelope = { tasks: Task[] };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } }); }
  catch { throw new Error('Task persistence is unavailable. Check that the local AI Studio runtime is running.'); }
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'The Task request failed.');
  return body as T;
}

function pathFor(workspaceId: string, taskId?: string): string {
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}/tasks`;
  return taskId ? `${base}/${encodeURIComponent(taskId)}` : base;
}

export const taskApi = {
  async list(workspaceId: string, sourceChatId?: string): Promise<Task[]> {
    const query = sourceChatId ? `?sourceChatId=${encodeURIComponent(sourceChatId)}` : '';
    return (await request<TaskListEnvelope>(`${pathFor(workspaceId)}${query}`)).tasks;
  },
  async get(workspaceId: string, taskId: string): Promise<Task> { return (await request<TaskEnvelope>(pathFor(workspaceId, taskId))).task; },
  async create(workspaceId: string, input: { title: string; goal: string; sourceChatId?: string }): Promise<Task> {
    return (await request<TaskEnvelope>(pathFor(workspaceId), { method: 'POST', body: JSON.stringify(input) })).task;
  },
  async update(workspaceId: string, taskId: string, input: { title?: string; goal?: string; status?: TaskStatus }): Promise<Task> {
    return (await request<TaskEnvelope>(pathFor(workspaceId, taskId), { method: 'PATCH', body: JSON.stringify(input) })).task;
  },
};
