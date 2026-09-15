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
