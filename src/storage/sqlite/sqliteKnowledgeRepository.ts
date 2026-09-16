import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { KnowledgeRepository } from '../../application/knowledge/knowledgeRepository.ts';
import { KnowledgeError, type Knowledge } from '../../core/knowledge/knowledge.ts';
import { applyMigrations } from './migrations.ts';

export class SqliteKnowledgeRepository implements KnowledgeRepository {
  private readonly database: DatabaseSync;
  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    applyMigrations(this.database);
  }
  create(record: Knowledge): Knowledge {
    this.database.prepare(`INSERT INTO knowledge (id, workspace_id, task_id, artifact_id, report_id, status, updated_at, revision, snapshot_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(record.id, record.workspaceId, record.source.taskId,
      record.source.type === 'artifact' ? record.source.id : null, record.source.type === 'task-report' ? record.source.id : null,
      record.status, record.updatedAt, record.revision, JSON.stringify(record));
    return record;
  }
  getById(id: string): Knowledge | null {
    const row = this.database.prepare('SELECT snapshot_json FROM knowledge WHERE id = ?').get(id);
    return row ? JSON.parse(String(row.snapshot_json)) as Knowledge : null;
  }
  listForWorkspace(workspaceId: string): Knowledge[] {
    return this.database.prepare('SELECT snapshot_json FROM knowledge WHERE workspace_id = ? ORDER BY updated_at DESC, id ASC').all(workspaceId).map((row) => JSON.parse(String(row.snapshot_json)) as Knowledge);
  }
  save(record: Knowledge): Knowledge {
    const next = { ...record, revision: record.revision + 1 };
    const result = this.database.prepare('UPDATE knowledge SET status = ?, updated_at = ?, revision = ?, snapshot_json = ? WHERE id = ? AND revision = ?')
      .run(next.status, next.updatedAt, next.revision, JSON.stringify(next), record.id, record.revision);
    if (result.changes !== 1) throw new KnowledgeError('conflict', 'Knowledge changed. Reload and review before saving.');
    return next;
  }
  close(): void { this.database.close(); }
}
