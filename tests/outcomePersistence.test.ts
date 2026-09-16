import { rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { OutcomeService } from '../src/application/outcomes/outcomeService.ts';
import { SqliteOutcomeRepository } from '../src/storage/sqlite/sqliteOutcomeRepository.ts';
import { outcomeFixture } from './outcomeFixtures.ts';

describe('SQLite Artifact and Task Report persistence', () => {
  it('reconstructs the same Artifact and Task Report after repository restart', async () => {
    const f = outcomeFixture();
    try {
      const execution = await f.completedExecution();
      const artifact = f.outcomeService.createArtifact('workspace-a', { title: 'Restart result', kind: 'result', taskId: 'task-a', sourceExecutionId: execution.id, sourceContributionStepId: 'step-2' });
      const report = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
      const reopened = new SqliteOutcomeRepository(f.path);
      const service = new OutcomeService(reopened, f.workspaces, f.tasks, f.repository);
      try {
        expect(service.getArtifact('workspace-a', artifact.id)).toEqual(artifact);
        expect(service.getTaskReport('workspace-a', report.id)).toEqual(report);
      } finally { reopened.close(); }
    } finally { await f.closeOutcomes(); }
  });

  it('applies additive Stage 9 migrations while preserving Stage 1–8 records and restrictive references', async () => {
    const f = outcomeFixture();
    try {
      const execution = await f.completedExecution();
      f.outcomeRepository.close();
      const database = new DatabaseSync(f.path);
      database.exec('DROP TABLE knowledge; DROP TABLE task_report_artifacts; DROP TABLE task_report_executions; DROP TABLE task_reports; DROP TABLE artifacts; DELETE FROM schema_migrations WHERE version IN (5, 6, 7); PRAGMA user_version = 4;');
      const beforeTask = f.tasks.getById('task-a');
      const beforeExecution = f.repository.getById(execution.id);
      const upgraded = new SqliteOutcomeRepository(f.path);
      try {
        expect(database.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(database.prepare('PRAGMA user_version').get()?.user_version).toBe(7);
        expect(f.tasks.getById('task-a')).toEqual(beforeTask);
        expect(f.repository.getById(execution.id)).toEqual(beforeExecution);
        expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
        const service = new OutcomeService(upgraded, f.workspaces, f.tasks, f.repository, { createId: () => 'artifact-fk' });
        service.createArtifact('workspace-a', { title: 'Protected result', kind: 'result', taskId: 'task-a', sourceExecutionId: execution.id, sourceContributionStepId: 'step-1' });
        service.generateTaskReport('workspace-a', 'task-a');
        expect(() => database.exec(`DELETE FROM executions WHERE id = '${execution.id}'`)).toThrow();
        expect(() => database.exec("DELETE FROM tasks WHERE id = 'task-a'")).toThrow();
      } finally { upgraded.close(); database.close(); }
    } finally {
      // The fixture repository was closed above; close only the remaining resources.
      await f.service.close(); f.repository.close(); f.tasks.close(); f.workspaces.close();
      rmSync(f.directory, { recursive: true, force: true });
    }
  });
});
