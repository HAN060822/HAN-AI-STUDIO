import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { TaskRepository } from '../../application/tasks/taskRepository.ts';
import type { Task, TaskStatus } from '../../core/tasks/task.ts';
import { applyMigrations } from './migrations.ts';

type TaskRow = { id: string; workspace_id: string; source_chat_id: string | null; title: string; goal: string; status: TaskStatus; created_at: string; updated_at: string; completed_at: string | null; schema_version: number };

function fromRow(row: TaskRow): Task {
  return { id: row.id, workspaceId: row.workspace_id, sourceChatId: row.source_chat_id, title: row.title, goal: row.goal, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, completedAt: row.completed_at, schemaVersion: row.schema_version };
}

export class SqliteTaskRepository implements TaskRepository {
  readonly databasePath: string;
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    this.databasePath = databasePath;
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    applyMigrations(this.database);
  }

  create(task: Task): Task {
    this.database.prepare(`INSERT INTO tasks (id, workspace_id, source_chat_id, title, goal, status, created_at, updated_at, completed_at, schema_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(task.id, task.workspaceId, task.sourceChatId, task.title, task.goal, task.status, task.createdAt, task.updatedAt, task.completedAt, task.schemaVersion);
    return task;
  }

  getById(id: string): Task | null {
    const row = this.database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? fromRow(row) : null;
  }

  listForWorkspace(workspaceId: string, sourceChatId?: string): Task[] {
    const rows = sourceChatId === undefined
      ? this.database.prepare('SELECT * FROM tasks WHERE workspace_id = ? ORDER BY updated_at DESC, id ASC').all(workspaceId)
      : this.database.prepare('SELECT * FROM tasks WHERE workspace_id = ? AND source_chat_id = ? ORDER BY updated_at DESC, id ASC').all(workspaceId, sourceChatId);
    return (rows as TaskRow[]).map(fromRow);
  }

  save(task: Task): Task {
    const result = this.database.prepare(`UPDATE tasks SET title = ?, goal = ?, status = ?, updated_at = ?, completed_at = ?, schema_version = ? WHERE id = ?`)
      .run(task.title, task.goal, task.status, task.updatedAt, task.completedAt, task.schemaVersion, task.id);
    if (result.changes !== 1) throw new Error(`Task ${task.id} could not be saved.`);
    return task;
  }

  close(): void { this.database.close(); }
}
