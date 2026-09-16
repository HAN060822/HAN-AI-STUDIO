import type { Task } from '../../core/tasks/task.ts';

export interface TaskRepository {
  create(task: Task): Task;
  getById(id: string): Task | null;
  listForWorkspace(workspaceId: string, sourceChatId?: string): Task[];
  save(task: Task): Task;
}
