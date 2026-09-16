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
