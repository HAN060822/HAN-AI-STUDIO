import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ExecutionError, type Execution } from '../../core/executions/execution.ts';
import type { ExecutionRepository } from '../../application/executions/executionRepository.ts';
import { applyMigrations } from './migrations.ts';

export class SqliteExecutionRepository implements ExecutionRepository {
  private readonly database: DatabaseSync;
  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    applyMigrations(this.database);
  }
  create(execution: Execution): Execution {
    this.database.prepare('INSERT INTO executions (id, workspace_id, task_id, runtime_id, status, updated_at, revision, snapshot_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(execution.id, execution.workspaceId, execution.taskId, execution.runtimeId, execution.status, execution.updatedAt, execution.revision, JSON.stringify(execution));
    return execution;
  }
  getById(id: string): Execution | null {
    const row = this.database.prepare('SELECT snapshot_json FROM executions WHERE id = ?').get(id);
    return row ? JSON.parse(String(row.snapshot_json)) as Execution : null;
  }
  listForWorkspace(workspaceId: string): Execution[] {
    return this.database.prepare('SELECT snapshot_json FROM executions WHERE workspace_id = ? ORDER BY updated_at DESC, id ASC').all(workspaceId).map((row) => JSON.parse(String(row.snapshot_json)) as Execution);
  }
  listRunning(runtimeId: string): Execution[] {
    return this.database.prepare("SELECT snapshot_json FROM executions WHERE runtime_id = ? AND status = 'running'").all(runtimeId).map((row) => JSON.parse(String(row.snapshot_json)) as Execution);
  }
  save(execution: Execution): Execution {
    const next = { ...execution, revision: execution.revision + 1 };
    const result = this.database.prepare('UPDATE executions SET status = ?, updated_at = ?, revision = ?, snapshot_json = ? WHERE id = ? AND revision = ?')
      .run(next.status, next.updatedAt, next.revision, JSON.stringify(next), next.id, execution.revision);
    if (result.changes !== 1) throw new ExecutionError('checkpoint_conflict', 'Execution changed since it was read; reload before another control.');
    return next;
  }
  close(): void { this.database.close(); }
}
