import type { DatabaseSync } from 'node:sqlite';

const migrations = [
  {
    version: 1,
    name: 'create_workspaces',
    sql: `
      CREATE TABLE workspaces (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        schema_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX workspaces_status_updated_idx ON workspaces(status, updated_at DESC);
    `,
  },
  {
    version: 2,
    name: 'create_chats_and_messages',
    sql: `
      CREATE TABLE chats (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
      );
      CREATE INDEX chats_workspace_updated_idx ON chats(workspace_id, updated_at DESC, id ASC);

      CREATE TABLE messages (
        id TEXT PRIMARY KEY NOT NULL,
        chat_id TEXT NOT NULL,
        author_role TEXT NOT NULL CHECK (author_role IN ('user', 'agent', 'system')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE RESTRICT
      );
      CREATE INDEX messages_chat_created_idx ON messages(chat_id, created_at ASC, id ASC);
    `,
  },
  {
    version: 3,
    name: 'create_tasks',
    sql: `
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL,
        source_chat_id TEXT,
        title TEXT NOT NULL,
        goal TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft', 'discussing', 'paused', 'blocked', 'completed', 'cancelled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        schema_version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
        FOREIGN KEY (source_chat_id) REFERENCES chats(id) ON DELETE RESTRICT
      );
      CREATE INDEX tasks_workspace_updated_idx ON tasks(workspace_id, updated_at DESC, id ASC);
      CREATE INDEX tasks_source_chat_updated_idx ON tasks(source_chat_id, updated_at DESC, id ASC);
    `,
  },
  {
    version: 4,
    name: 'create_executions',
    sql: `
      CREATE TABLE executions (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL,
        task_id TEXT,
        runtime_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('created', 'running', 'paused', 'cancelled', 'interrupted', 'failed', 'completed')),
        updated_at TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision >= 0),
        snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT
      );
      CREATE INDEX executions_workspace_updated_idx ON executions(workspace_id, updated_at DESC, id ASC);
      CREATE INDEX executions_runtime_status_idx ON executions(runtime_id, status);
    `,
  },
  {
    version: 5,
    name: 'create_artifacts_and_task_reports',
    sql: `
      CREATE TABLE artifacts (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL,
        task_id TEXT,
        source_execution_id TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('document', 'result', 'note')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
        FOREIGN KEY (source_execution_id) REFERENCES executions(id) ON DELETE RESTRICT
      );
      CREATE INDEX artifacts_workspace_updated_idx ON artifacts(workspace_id, updated_at DESC, id ASC);
      CREATE INDEX artifacts_task_updated_idx ON artifacts(task_id, updated_at DESC, id ASC);
      CREATE INDEX artifacts_execution_idx ON artifacts(source_execution_id, id ASC);

      CREATE TABLE task_reports (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL,
        task_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT
      );
      CREATE INDEX task_reports_workspace_updated_idx ON task_reports(workspace_id, updated_at DESC, id ASC);
    `,
  },
  {
    version: 6,
    name: 'create_task_report_references',
    sql: `
      CREATE TABLE task_report_executions (
        report_id TEXT NOT NULL,
        execution_id TEXT NOT NULL,
        PRIMARY KEY (report_id, execution_id),
        FOREIGN KEY (report_id) REFERENCES task_reports(id) ON DELETE RESTRICT,
        FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE RESTRICT
      );
      CREATE TABLE task_report_artifacts (
        report_id TEXT NOT NULL,
        artifact_id TEXT NOT NULL,
        PRIMARY KEY (report_id, artifact_id),
        FOREIGN KEY (report_id) REFERENCES task_reports(id) ON DELETE RESTRICT,
        FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE RESTRICT
      );
    `,
  },
  {
    version: 7,
    name: 'create_reviewed_knowledge',
    sql: `
      CREATE TABLE knowledge (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
        task_id TEXT REFERENCES tasks(id) ON DELETE RESTRICT,
        artifact_id TEXT REFERENCES artifacts(id) ON DELETE RESTRICT,
        report_id TEXT REFERENCES task_reports(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('candidate', 'pending', 'failed', 'saved')),
        updated_at TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision >= 0),
        snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
        CHECK (artifact_id IS NULL OR report_id IS NULL)
      );
      CREATE INDEX knowledge_workspace_updated_idx ON knowledge(workspace_id, updated_at DESC, id ASC);
    `,
  },
  {
    version: 8,
    name: 'create_governance_evidence',
    sql: `
      CREATE TABLE authority_approvals (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE RESTRICT,
        consumed_at TEXT NOT NULL,
        snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json))
      );
      CREATE TABLE audit_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        attempt_id TEXT NOT NULL,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE RESTRICT,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        approval_id TEXT REFERENCES authority_approvals(id) ON DELETE RESTRICT,
        snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json))
      );
      CREATE INDEX audit_resource_idx ON audit_events(workspace_id, resource_type, resource_id, sequence DESC);
      CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'Audit is append-only'); END;
      CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'Audit is append-only'); END;
      CREATE TRIGGER approval_no_update BEFORE UPDATE ON authority_approvals BEGIN SELECT RAISE(ABORT, 'Consumed approval is immutable'); END;
      CREATE TRIGGER approval_no_delete BEFORE DELETE ON authority_approvals BEGIN SELECT RAISE(ABORT, 'Consumed approval is immutable'); END;
    `,
  },
] as const;

export function applyMigrations(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    database.prepare('SELECT version FROM schema_migrations').all().map((row) => Number(row.version)),
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    database.exec('BEGIN IMMEDIATE;');
    try {
      database.exec(migration.sql);
      database.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, new Date().toISOString());
      database.exec(`PRAGMA user_version = ${migration.version};`);
      database.exec('COMMIT;');
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }
  }
}
