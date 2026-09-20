import { LOCAL_HAN } from '../src/core/governance/governance.ts';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { KnowledgeService } from '../src/application/knowledge/knowledgeService.ts';
import { SqliteKnowledgeRepository } from '../src/storage/sqlite/sqliteKnowledgeRepository.ts';
import { knowledgeFixture, manualKnowledge } from './knowledgeFixtures.ts';

describe('Knowledge persistence and additive migration', () => {
  it('reloads candidates and saved records, including provenance, schema version and destination', async () => {
    const f = knowledgeFixture();
    try {
      const candidate = f.knowledge.create('workspace-a', manualKnowledge);
      const report = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
      const selected = f.knowledge.create('workspace-a', { sourceType: 'task-report', sourceId: report.id });
      const saved = f.knowledge.save(LOCAL_HAN, 'workspace-a', selected.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', selected.id).token });
      const reopened = new SqliteKnowledgeRepository(f.path);
      try {
        const service = new KnowledgeService(reopened, f.workspaces, f.outcomeRepository, f.connector, f.governance);
        expect(service.get('workspace-a', candidate.id)).toEqual(candidate);
        expect(service.get('workspace-a', saved.id)).toEqual(saved);
        expect(service.verify('workspace-a', saved.id).matches).toBe(true);
        expect(service.list('workspace-b')).toEqual([]);
        const changed = reopened.save({ ...candidate, schemaVersion: 2 });
        expect(reopened.getById(candidate.id)?.schemaVersion).toBe(2);
        expect(() => reopened.save(candidate)).toThrow(/changed/);
        expect(reopened.getById(candidate.id)).toEqual(changed);
      } finally { reopened.close(); }
    } finally { await f.closeKnowledge(); }
  });
  it('upgrades a populated Stage 9 database without changing its records and retains source foreign keys', async () => {
    const f = knowledgeFixture();
    const database = new DatabaseSync(f.path);
    try {
      database.exec('PRAGMA foreign_keys = ON;');
      const execution = await f.completedExecution();
      const artifact = f.outcomeService.createArtifact('workspace-a', { title: 'Keep source', kind: 'result', taskId: 'task-a', sourceExecutionId: execution.id, sourceContributionStepId: 'step-1' });
      const report = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
      const workspace = f.workspaces.getById('workspace-a'); const task = f.tasks.getById('task-a');
      database.exec('DROP TABLE audit_events; DROP TABLE authority_approvals; DROP TABLE knowledge; DELETE FROM schema_migrations WHERE version IN (7, 8); PRAGMA user_version = 6;');
      const upgraded = new SqliteKnowledgeRepository(f.path);
      try {
        expect(database.prepare('PRAGMA user_version').get()?.user_version).toBe(8);
        expect(f.workspaces.getById('workspace-a')).toEqual(workspace);
        expect(f.tasks.getById('task-a')).toEqual(task);
        expect(f.repository.getById(execution.id)).toEqual(execution);
        expect(f.outcomeRepository.getArtifactById(artifact.id)).toEqual(artifact);
        expect(f.outcomeRepository.getTaskReportById(report.id)).toEqual(report);
        const service = new KnowledgeService(upgraded, f.workspaces, f.outcomeRepository, f.connector, f.governance);
        service.create('workspace-a', { sourceType: 'artifact', sourceId: artifact.id });
        service.create('workspace-a', { sourceType: 'task-report', sourceId: report.id });
        expect(() => database.prepare('DELETE FROM task_reports WHERE id = ?').run(report.id)).toThrow();
        expect(() => database.prepare('DELETE FROM artifacts WHERE id = ?').run(artifact.id)).toThrow();
        expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      } finally { upgraded.close(); }
    } finally { database.close(); await f.closeKnowledge(); }
  });
});
