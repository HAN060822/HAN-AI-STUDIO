export const TASK_SCHEMA_VERSION = 1 as const;

export type TaskStatus = 'draft' | 'discussing' | 'paused' | 'blocked' | 'completed' | 'cancelled';

export type Task = {
  id: string;
  workspaceId: string;
  sourceChatId: string | null;
  title: string;
  goal: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  schemaVersion: number;
};

export type CreateTaskInput = { title: string; goal: string; sourceChatId?: string | null };
export type UpdateTaskInput = { title?: string; goal?: string; status?: TaskStatus };

export class TaskValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'TaskValidationError'; }
}

export class InvalidTaskTransitionError extends TaskValidationError {
  constructor(from: TaskStatus, to: TaskStatus) { super(`Task cannot transition from ${from} to ${to}.`); this.name = 'InvalidTaskTransitionError'; }
}

export function normalizeTaskTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized) throw new TaskValidationError('Task title is required.');
  if (normalized.length > 180) throw new TaskValidationError('Task title must be 180 characters or fewer.');
  return normalized;
}

export function normalizeTaskGoal(goal: string): string {
  const normalized = goal.trim();
  if (!normalized) throw new TaskValidationError('Task goal is required.');
  if (normalized.length > 4000) throw new TaskValidationError('Task goal must be 4,000 characters or fewer.');
  return normalized;
}

const transitions: Record<TaskStatus, readonly TaskStatus[]> = {
  draft: ['discussing', 'completed', 'cancelled'],
  discussing: ['paused', 'blocked', 'completed', 'cancelled'],
  paused: ['discussing', 'completed', 'cancelled'],
  blocked: ['discussing', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function allowedTaskTransitions(status: TaskStatus): readonly TaskStatus[] { return transitions[status]; }

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (from === to || !transitions[from].includes(to)) throw new InvalidTaskTransitionError(from, to);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && Object.hasOwn(transitions, value);
}
