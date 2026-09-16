import { randomUUID } from 'node:crypto';
import type { ConversationRepository } from '../conversations/conversationRepository.ts';
import type { WorkspaceRepository } from '../workspaces/workspaceRepository.ts';
import {
  TASK_SCHEMA_VERSION,
  assertTaskTransition,
  normalizeTaskGoal,
  normalizeTaskTitle,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from '../../core/tasks/task.ts';
import type { TaskRepository } from './taskRepository.ts';

export class TaskNotFoundError extends Error {
  constructor(id: string) { super(`Task ${id} was not found.`); this.name = 'TaskNotFoundError'; }
}
export class TaskWorkspaceNotFoundError extends Error {
  constructor(id: string) { super(`Workspace ${id} was not found.`); this.name = 'TaskWorkspaceNotFoundError'; }
}
export class TaskWorkspaceMismatchError extends Error {
  constructor() { super('This task does not belong to the selected workspace.'); this.name = 'TaskWorkspaceMismatchError'; }
}
export class TaskSourceChatNotFoundError extends Error {
  constructor(id: string) { super(`Source chat ${id} was not found.`); this.name = 'TaskSourceChatNotFoundError'; }
}
export class TaskSourceChatWorkspaceMismatchError extends Error {
  constructor() { super('The source chat does not belong to the selected workspace.'); this.name = 'TaskSourceChatWorkspaceMismatchError'; }
}

type TaskServiceOptions = { createId?: () => string; now?: () => Date };

export class TaskService {
  private readonly tasks: TaskRepository;
  private readonly workspaces: WorkspaceRepository;
  private readonly conversations: ConversationRepository;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(tasks: TaskRepository, workspaces: WorkspaceRepository, conversations: ConversationRepository, options: TaskServiceOptions = {}) {
    this.tasks = tasks;
    this.workspaces = workspaces;
    this.conversations = conversations;
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  createTask(workspaceId: string, input: CreateTaskInput): Task {
    this.requireWorkspace(workspaceId);
    const sourceChatId = input.sourceChatId ?? null;
    if (sourceChatId) this.requireSourceChat(workspaceId, sourceChatId);
    const timestamp = this.now().toISOString();
    return this.tasks.create({
      id: this.createId(), workspaceId, sourceChatId,
      title: normalizeTaskTitle(input.title), goal: normalizeTaskGoal(input.goal), status: 'draft',
      createdAt: timestamp, updatedAt: timestamp, completedAt: null, schemaVersion: TASK_SCHEMA_VERSION,
    });
  }

  listTasksForWorkspace(workspaceId: string, sourceChatId?: string): Task[] {
    this.requireWorkspace(workspaceId);
    if (sourceChatId) this.requireSourceChat(workspaceId, sourceChatId);
    return this.tasks.listForWorkspace(workspaceId, sourceChatId);
  }

  getTask(workspaceId: string, taskId: string): Task {
    this.requireWorkspace(workspaceId);
    const task = this.tasks.getById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    if (task.workspaceId !== workspaceId) throw new TaskWorkspaceMismatchError();
    return task;
  }

  updateTask(workspaceId: string, taskId: string, input: UpdateTaskInput): Task {
    const task = this.getTask(workspaceId, taskId);
    const timestamp = this.now().toISOString();
    const status = input.status ?? task.status;
    if (input.status !== undefined) assertTaskTransition(task.status, input.status);
    return this.tasks.save({
      ...task,
      title: input.title === undefined ? task.title : normalizeTaskTitle(input.title),
      goal: input.goal === undefined ? task.goal : normalizeTaskGoal(input.goal),
      status,
      updatedAt: timestamp,
      completedAt: status === 'completed' ? timestamp : task.completedAt,
    });
  }

  private requireWorkspace(workspaceId: string): void {
    if (!this.workspaces.getById(workspaceId)) throw new TaskWorkspaceNotFoundError(workspaceId);
  }

  private requireSourceChat(workspaceId: string, chatId: string): void {
    const chat = this.conversations.getChatById(chatId);
    if (!chat) throw new TaskSourceChatNotFoundError(chatId);
    if (chat.workspaceId !== workspaceId) throw new TaskSourceChatWorkspaceMismatchError();
  }
}
