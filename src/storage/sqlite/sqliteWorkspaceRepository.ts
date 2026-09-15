import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { WorkspaceRepository } from '../../application/workspaces/workspaceRepository.ts';
import type { Workspace, WorkspaceStatus } from '../../core/workspaces/workspace.ts';
import { applyMigrations } from './migrations.ts';

type WorkspaceRow = {
  id: string;
  name: string;
  description: string | null;
  status: WorkspaceStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  schema_version: number;
};

function fromRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    schemaVersion: 1,
  };
}

export class SqliteWorkspaceRepository implements WorkspaceRepository {
  readonly databasePath: string;
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    this.databasePath = databasePath;
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    applyMigrations(this.database);
  }

  create(workspace: Workspace): Workspace {
    this.database.prepare(`INSERT INTO workspaces
      (id, name, description, status, created_at, updated_at, archived_at, schema_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(workspace.id, workspace.name, workspace.description, workspace.status, workspace.createdAt, workspace.updatedAt, workspace.archivedAt, workspace.schemaVersion);
    return workspace;
  }

  getById(id: string): Workspace | null {
    const row = this.database.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as WorkspaceRow | undefined;
    return row ? fromRow(row) : null;
  }

  list(includeArchived: boolean): Workspace[] {
    const sql = includeArchived
      ? 'SELECT * FROM workspaces ORDER BY updated_at DESC, id ASC'
      : "SELECT * FROM workspaces WHERE status = 'active' ORDER BY updated_at DESC, id ASC";
    return (this.database.prepare(sql).all() as WorkspaceRow[]).map(fromRow);
  }

  save(workspace: Workspace): Workspace {
    const result = this.database.prepare(`UPDATE workspaces SET
      name = ?, description = ?, status = ?, updated_at = ?, archived_at = ?, schema_version = ?
      WHERE id = ?`)
      .run(workspace.name, workspace.description, workspace.status, workspace.updatedAt, workspace.archivedAt, workspace.schemaVersion, workspace.id);
    if (result.changes !== 1) throw new Error(`Workspace ${workspace.id} could not be saved.`);
    return workspace;
  }

  close(): void {
    this.database.close();
  }
}
