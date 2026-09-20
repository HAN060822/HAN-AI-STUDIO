import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { LOCAL_HAN } from '../src/core/governance/governance.ts';
import { SqliteGovernanceRepository } from '../src/storage/sqlite/sqliteGovernanceRepository.ts';
import { knowledgeFixture, manualKnowledge } from './knowledgeFixtures.ts';

describe('Additive durable governance evidence', () => {
  it('preserves approval and actor/action/resource/outcome history after restart and rejects update/delete', async () => {
    const f = knowledgeFixture(); const database = new DatabaseSync(f.path);
    try {
      const candidate = f.knowledge.create('workspace-a', manualKnowledge);
      f.knowledge.save(LOCAL_HAN, 'workspace-a', candidate.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', candidate.id).token });
      const events = f.governanceRepository.list('workspace-a', 'knowledge', candidate.id);
      const reopened = new SqliteGovernanceRepository(f.path);
      try {
        expect(reopened.list('workspace-a', 'knowledge', candidate.id)).toEqual(events);
        expect(reopened.list('workspace-b', 'knowledge', candidate.id)).toEqual([]);
        expect(reopened.getApproval(events[0].approvalId!)).toEqual(f.governanceRepository.getApproval(events[0].approvalId!));
        for (const table of ['audit_events', 'authority_approvals']) {
          expect(() => database.exec(`DELETE FROM ${table}`)).toThrow(/immutable|append-only/);
          expect(() => database.exec(`UPDATE ${table} SET snapshot_json = '{}'`)).toThrow(/immutable|append-only/);
        }
        expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      } finally { reopened.close(); }
    } finally { database.close(); await f.closeKnowledge(); }
  });
  it('upgrades populated Stage 10 state without modifying source records or backfilling fictional audits', async () => {
    const f = knowledgeFixture(); const database = new DatabaseSync(f.path);
    try {
      const execution = await f.completedExecution();
      const artifact = f.outcomeService.createArtifact('workspace-a', { title: 'Existing artifact', kind: 'result', taskId: 'task-a', sourceExecutionId: execution.id, sourceContributionStepId: 'step-1' });
      const report = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
      const candidate = f.knowledge.create('workspace-a', { sourceType: 'artifact', sourceId: artifact.id });
      const workspace = f.workspaces.getById('workspace-a'); const task = f.tasks.getById('task-a');
      database.exec('DROP TABLE audit_events; DROP TABLE authority_approvals; DELETE FROM schema_migrations WHERE version = 8; PRAGMA user_version = 7;');
      const upgraded = new SqliteGovernanceRepository(f.path);
      try {
        expect(database.prepare('PRAGMA user_version').get()?.user_version).toBe(8);
        expect(upgraded.list('workspace-a', 'knowledge', candidate.id)).toEqual([]);
        expect(f.workspaces.getById('workspace-a')).toEqual(workspace); expect(f.tasks.getById('task-a')).toEqual(task);
        expect(f.repository.getById(execution.id)).toEqual(execution); expect(f.outcomeRepository.getArtifactById(artifact.id)).toEqual(artifact);
        expect(f.outcomeRepository.getTaskReportById(report.id)).toEqual(report); expect(f.knowledge.get('workspace-a', candidate.id)).toEqual(candidate);
        expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      } finally { upgraded.close(); }
    } finally { database.close(); await f.closeKnowledge(); }
  });
});
