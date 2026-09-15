import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceService } from '../src/application/workspaces/workspaceService.ts';
import { SqliteWorkspaceRepository } from '../src/storage/sqlite/sqliteWorkspaceRepository.ts';

const temporaryDirectories: string[] = [];
afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('SQLite workspace persistence', () => {
  it('maps the schema version stored in the database row', () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-ai-studio-schema-version-'));
    temporaryDirectories.push(directory);
    const repository = new SqliteWorkspaceRepository(join(directory, 'studio.sqlite'));
    repository.create({
      id: 'schema-version-check',
      name: 'Schema mapping check',
      description: null,
      status: 'active',
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
      archivedAt: null,
      schemaVersion: 7,
    });

    expect(repository.getById('schema-version-check')?.schemaVersion).toBe(7);
    repository.close();
  });

  it('survives repository restart, rename, archive, and restore with the same ID', () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-ai-studio-workspace-'));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, 'studio.sqlite');
    const firstRepository = new SqliteWorkspaceRepository(databasePath);
    const firstService = new WorkspaceService(firstRepository);
    const created = firstService.createWorkspace({ name: 'Persistent workspace', description: 'On disk' });
    const renamed = firstService.updateWorkspace(created.id, { name: 'Persistent studio' });
    firstService.archiveWorkspace(created.id);
    firstRepository.close();

    const reopenedRepository = new SqliteWorkspaceRepository(databasePath);
    const reopenedService = new WorkspaceService(reopenedRepository);
    expect(reopenedService.listWorkspaces()).toEqual([]);
    expect(reopenedService.listWorkspaces(true)).toHaveLength(1);
    expect(reopenedService.getWorkspace(created.id)).toMatchObject({ id: created.id, name: 'Persistent studio', description: 'On disk', status: 'archived' });
    expect(renamed.id).toBe(created.id);
    reopenedService.restoreWorkspace(created.id);
    expect(reopenedService.listWorkspaces()).toHaveLength(1);
    reopenedRepository.close();
  });
});
