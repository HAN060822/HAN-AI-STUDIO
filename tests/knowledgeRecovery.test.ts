import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { knowledgeFixture } from './knowledgeFixtures.ts';
import { LOCAL_HAN } from '../src/core/governance/governance.ts';
import { KnowledgeService } from '../src/application/knowledge/knowledgeService.ts';
import { GovernanceService } from '../src/application/governance/governanceService.ts';
import { prototypeGrants } from '../src/application/governance/prototypePolicy.ts';
import { ObsidianConnector } from '../src/connectors/obsidian/obsidianConnector.ts';
import { SqliteKnowledgeRepository } from '../src/storage/sqlite/sqliteKnowledgeRepository.ts';
import { SqliteGovernanceRepository } from '../src/storage/sqlite/sqliteGovernanceRepository.ts';

async function source(f: ReturnType<typeof knowledgeFixture>) {
  const execution = await f.completedExecution();
  const artifact = f.outcomeService.createArtifact('workspace-a', { title: 'Stage 13 recovery outcome', kind: 'result', sourceExecutionId: execution.id, sourceContributionStepId: 'step-2' });
  const report = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
  const record = f.knowledge.create('workspace-a', { sourceType: 'artifact', sourceId: artifact.id });
  return { execution, artifact, report, record };
}
function save(service: KnowledgeService, id: string) { return service.save(LOCAL_HAN, 'workspace-a', id, { approved: true, previewToken: service.preview('workspace-a', id).token }); }
function reopen(f: ReturnType<typeof knowledgeFixture>) {
  const records = new SqliteKnowledgeRepository(f.path); const audits = new SqliteGovernanceRepository(f.path);
  const governance = new GovernanceService(audits, prototypeGrants('review'));
  return { service: new KnowledgeService(records, f.workspaces, f.outcomeRepository, new ObsidianConnector(f.vault), governance), governance, close() { records.close(); audits.close(); } };
}
describe('Stage 13 cross-module publication uncertainty and recovery', () => {
  it('retains unconfirmed telemetry alongside committed work and permits deliberate outcomes without inventing final evidence', async () => {
    const f = knowledgeFixture();
    try {
      const append = f.telemetry.append.bind(f.telemetry);
      vi.spyOn(f.telemetry, 'append').mockImplementation((record) => { if (record.phase === 'final') throw new Error('DUMMY-telemetry-disk-fault'); append(record); });
      const { execution, artifact, record } = await source(f);
      expect(execution.status).toBe('completed');
      expect(execution.checkpoint.contributions.every((item) => item.measurement?.telemetry === 'unconfirmed')).toBe(true);
      expect(f.telemetry.list('workspace-a', execution.id).map((item) => item.phase)).toEqual(['started', 'started']);
      expect(artifact.content).toBe(execution.checkpoint.contributions[1].output);
      expect(save(f.knowledge, record.id).status).toBe('saved');
      const reopened = reopen(f);
      try { expect(reopened.service.verify('workspace-a', record.id).matches).toBe(true); } finally { reopened.close(); }
      expect(f.telemetry.list('workspace-a', execution.id).every((item) => item.completedAt === null && item.usage.source === 'unavailable')).toBe(true);
    } finally { vi.restoreAllMocks(); await f.closeKnowledge(); }
  });
  it('recovers published-but-unconfirmed Knowledge by fresh review without duplicate notes or fabricated audit success', async () => {
    const f = knowledgeFixture();
    try {
      const { execution, artifact, report, record } = await source(f);
      const original = f.knowledgeRepository.save.bind(f.knowledgeRepository);
      const failure = vi.spyOn(f.knowledgeRepository, 'save').mockImplementation((next) => { if (next.status === 'saved') throw new Error('DUMMY-private-storage-error'); return original(next); });
      expect(() => save(f.knowledge, record.id)).toThrow(); failure.mockRestore();
      const pending = f.knowledge.get('workspace-a', record.id); expect(pending.status).toBe('pending'); expect(pending.savedAt).toBeNull();
      const path = join(f.vault, pending.destination!.relativePath); const bytes = readFileSync(path);
      expect(f.governance.history(LOCAL_HAN, 'workspace-a', record.id).map((item) => item.outcome)).toEqual(['unconfirmed', 'started']);
      const reopened = reopen(f);
      try {
        expect(reopened.service.get('workspace-a', record.id)).toEqual(pending);
        expect(() => reopened.service.save(LOCAL_HAN, 'workspace-a', record.id, { previewToken: reopened.service.preview('workspace-a', record.id).token })).toThrow(/review/);
        expect(save(reopened.service, record.id).status).toBe('saved');
        expect(reopened.service.verify('workspace-a', record.id).matches).toBe(true);
        expect(readFileSync(path)).toEqual(bytes); expect(readdirSync(join(f.vault, 'Knowledge', 'AI-Studio-Generated'))).toHaveLength(1);
        const audit = reopened.governance.history(LOCAL_HAN, 'workspace-a', record.id);
        expect(audit.filter((item) => item.outcome === 'succeeded')).toHaveLength(1); expect(JSON.stringify(audit)).not.toContain('DUMMY');
      } finally { reopened.close(); }
      expect(f.repository.getById(execution.id)).toEqual(execution); expect(f.outcomeRepository.getArtifactById(artifact.id)).toEqual(artifact); expect(f.outcomeRepository.getTaskReportById(report.id)).toEqual(report);
      expect(f.telemetry.list('workspace-a', execution.id)).toHaveLength(4);
    } finally { vi.restoreAllMocks(); await f.closeKnowledge(); }
  });
  it('keeps a saved note and unmatched audit start after final-audit failure; retry verifies instead of claiming another publication', async () => {
    const f = knowledgeFixture();
    try {
      const { record } = await source(f);
      const append = f.governanceRepository.append.bind(f.governanceRepository);
      const failure = vi.spyOn(f.governanceRepository, 'append').mockImplementation((event) => { if (event.outcome !== 'started') throw new Error('DUMMY-audit-write-failed'); append(event); });
      expect(() => save(f.knowledge, record.id)).toThrow(/final audit could not be confirmed/); failure.mockRestore();
      const saved = f.knowledge.get('workspace-a', record.id); expect(saved.status).toBe('saved');
      const reopened = reopen(f);
      try {
        const before = reopened.governance.history(LOCAL_HAN, 'workspace-a', record.id); expect(before.map((item) => item.outcome)).toEqual(['started']);
        expect(reopened.service.verify('workspace-a', record.id).matches).toBe(true);
        expect(reopened.governance.history(LOCAL_HAN, 'workspace-a', record.id)).toEqual(before); // Verify is read-only.
        expect(save(reopened.service, record.id)).toEqual(saved);
        const events = reopened.governance.history(LOCAL_HAN, 'workspace-a', record.id);
        expect(events[0]).toMatchObject({ outcome: 'not_executed', code: 'already_saved_verified' });
        expect(events.some((item) => item.outcome === 'succeeded')).toBe(false); expect(events.at(-1)).toEqual(before[0]);
      } finally { reopened.close(); }
    } finally { vi.restoreAllMocks(); await f.closeKnowledge(); }
  });
  it('preserves source work through connector failure, unavailable configuration, reviewed retry and read-only verification mismatch', async () => {
    const f = knowledgeFixture();
    try {
      const { record, artifact, execution } = await source(f);
      vi.spyOn(f.connector, 'publish').mockImplementationOnce(() => { throw new Error('DUMMY-sensitive-filesystem-detail'); });
      const failed = save(f.knowledge, record.id); expect(failed.status).toBe('failed'); expect(JSON.stringify(failed)).not.toContain('DUMMY');
      expect(f.governance.history(LOCAL_HAN, 'workspace-a', record.id)[0].outcome).toBe('failed');
      const unavailable = new KnowledgeService(f.knowledgeRepository, f.workspaces, f.outcomeRepository, new ObsidianConnector(), f.governance);
      expect(unavailable.get('workspace-a', record.id)).toEqual(failed); expect(() => unavailable.preview('workspace-a', record.id)).toThrow(/Set HAN/);
      const reopened = reopen(f);
      try {
        const saved = save(reopened.service, record.id); expect(saved.approvedAt).toBe(failed.approvedAt); expect(saved.status).toBe('saved');
        const path = join(f.vault, saved.destination!.relativePath);
        writeFileSync(path, 'Stage 13 test-only simulated human edit');
        const auditBefore = reopened.governance.history(LOCAL_HAN, 'workspace-a', record.id);
        expect(reopened.service.verify('workspace-a', record.id).matches).toBe(false);
        expect(readFileSync(path, 'utf8')).toBe('Stage 13 test-only simulated human edit');
        expect(reopened.service.get('workspace-a', record.id)).toEqual(saved); expect(reopened.governance.history(LOCAL_HAN, 'workspace-a', record.id)).toEqual(auditBefore);
        expect(() => save(reopened.service, record.id)).toThrow(/missing or changed/);
        expect(reopened.governance.history(LOCAL_HAN, 'workspace-a', record.id).filter((item) => item.outcome === 'succeeded')).toHaveLength(1);
        expect(readFileSync(path, 'utf8')).toBe('Stage 13 test-only simulated human edit');
      } finally { reopened.close(); }
      expect(f.outcomeRepository.getArtifactById(artifact.id)).toEqual(artifact); expect(f.repository.getById(execution.id)).toEqual(execution);
    } finally { vi.restoreAllMocks(); await f.closeKnowledge(); }
  });
});
