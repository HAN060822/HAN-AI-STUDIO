import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeError, knowledgeRequest } from '../src/core/knowledge/knowledge.ts';
import { KnowledgeService } from '../src/application/knowledge/knowledgeService.ts';
import { ObsidianConnector, OBSIDIAN_DESTINATION } from '../src/connectors/obsidian/obsidianConnector.ts';
import { knowledgeFixture, manualKnowledge } from './knowledgeFixtures.ts';

const fixtures: ReturnType<typeof knowledgeFixture>[] = [];
function fixture() { const f = knowledgeFixture(); fixtures.push(f); return f; }
afterEach(async () => { for (const f of fixtures.splice(0)) await f.closeKnowledge(); });

describe('Knowledge validation and explicit promotion', () => {
  it.each([null, [], {}, { ...manualKnowledge, title: ' ' }, { ...manualKnowledge, content: 'x'.repeat(100001) }, { ...manualKnowledge, content: '\0' }, { ...manualKnowledge, sourceId: 'spoof' }, { sourceType: 'artifact', sourceId: '' }, { sourceType: 'chat', sourceId: 'x' }, { sourceType: 'artifact', sourceId: 'x', content: 'spoof' }, { ...manualKnowledge, relativePath: '../outside' }])('rejects invalid input %#', (input) => {
    expect(() => knowledgeRequest(input)).toThrow(KnowledgeError);
  });
  it('prepares and previews a durable manual candidate without any vault write', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge);
    expect(record).toMatchObject({ status: 'candidate', approvedAt: null, savedAt: null, source: { type: 'manual', id: null } });
    expect(f.knowledge.preview('workspace-a', record.id).markdown).toContain('UTF-8: 知识。');
    expect(existsSync(join(f.vault, 'Knowledge'))).toBe(false);
    expect(f.knowledgeRepository.getById(record.id)).toEqual(record);
  });
  it('snapshots Artifact provenance without modifying the source or Execution', async () => {
    const f = fixture(); const execution = await f.completedExecution();
    const artifact = f.outcomeService.createArtifact('workspace-a', { title: 'Result', kind: 'result', taskId: 'task-a', sourceExecutionId: execution.id, sourceContributionStepId: 'step-2' });
    const record = f.knowledge.create('workspace-a', { sourceType: 'artifact', sourceId: artifact.id });
    expect(record).toMatchObject({ title: artifact.title, content: artifact.content, source: { type: 'artifact', id: artifact.id, taskId: 'task-a', executionId: execution.id, sourceUpdatedAt: artifact.updatedAt } });
    expect(f.outcomeRepository.getArtifactById(artifact.id)).toEqual(artifact);
    expect(f.repository.getById(execution.id)).toEqual(execution);
  });
  it('snapshots a deterministic report and remains stable when the report is regenerated', () => {
    const f = fixture(); const report = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
    const record = f.knowledge.create('workspace-a', { sourceType: 'task-report', sourceId: report.id });
    expect(record.content).toContain(report.outcomeSummary);
    expect(record.source).toMatchObject({ type: 'task-report', id: report.id, taskId: 'task-a' });
    f.tasks.save({ ...f.tasks.getById('task-a')!, goal: 'New goal' }); f.outcomeService.generateTaskReport('workspace-a', 'task-a');
    expect(f.knowledge.get('workspace-a', record.id)).toEqual(record);
    expect(record.content).not.toContain('New goal');
  });
  it('rejects missing/cross-Workspace records and source references', () => {
    const f = fixture(); const report = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
    const artifact = f.outcomeService.createArtifact('workspace-a', { title: 'Note', kind: 'note', content: 'Value' });
    const record = f.knowledge.create('workspace-a', manualKnowledge);
    expect(() => f.knowledge.create('missing', manualKnowledge)).toThrow(/Workspace/);
    for (const [sourceType, sourceId] of [['artifact', artifact.id], ['task-report', report.id], ['artifact', 'missing']]) expect(() => f.knowledge.create('workspace-b', { sourceType, sourceId })).toThrow(/not found/);
    expect(() => f.knowledge.get('workspace-b', record.id)).toThrow(/not found/);
    expect(() => f.knowledge.preview('workspace-b', record.id)).toThrow(/not found/);
  });
  it('requires explicit approval of a current preview and creates one note on repeat save', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge);
    const preview = f.knowledge.preview('workspace-a', record.id);
    expect(() => f.knowledge.save('workspace-a', record.id, { approved: false, previewToken: preview.token })).toThrow(/explicitly approve/);
    expect(() => f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: 'stale' })).toThrow(/changed/);
    const saved = f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: preview.token });
    expect(saved).toMatchObject({ status: 'saved', failure: null, destination: { relativePath: preview.relativePath } });
    const repeated = f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', record.id).token });
    expect(repeated).toEqual(saved); expect(readdirSync(join(f.vault, OBSIDIAN_DESTINATION))).toHaveLength(1);
    expect(f.knowledge.verify('workspace-a', record.id).matches).toBe(true);
    expect(readFileSync(join(f.vault, preview.relativePath), 'utf8')).toContain(saved.approvedAt);
  });
  it('retains a failed candidate and retries with its stable identity and approval timestamp', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge);
    const fault = vi.spyOn(f.connector, 'publish').mockImplementationOnce(() => { throw new Error('disk full'); });
    const failed = f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', record.id).token });
    expect(failed.status).toBe('failed'); expect(failed.savedAt).toBeNull(); expect(failed.content).toBe(record.content);
    fault.mockRestore();
    const saved = f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', record.id).token });
    expect(saved.status).toBe('saved'); expect(saved.approvedAt).toBe(failed.approvedAt);
  });
  it('does not write a note if durable approval cannot be recorded', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge);
    const publish = vi.spyOn(f.connector, 'publish');
    const failure = vi.spyOn(f.knowledgeRepository, 'save').mockImplementationOnce(() => { throw new Error('Database unavailable'); });
    expect(() => f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', record.id).token })).toThrow('Database unavailable');
    expect(publish).not.toHaveBeenCalled(); expect(existsSync(join(f.vault, 'Knowledge'))).toBe(false);
    expect(f.knowledge.get('workspace-a', record.id)).toEqual(record);
    failure.mockRestore(); publish.mockRestore();
  });
  it('recovers the file-created/database-unconfirmed gap on explicit retry without a second note', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge);
    const originalSave = f.knowledgeRepository.save.bind(f.knowledgeRepository);
    vi.spyOn(f.knowledgeRepository, 'save').mockImplementation((next) => { if (next.status === 'saved') throw new Error('database write failed'); return originalSave(next); });
    expect(() => f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', record.id).token })).toThrow('database write failed');
    expect(f.knowledge.get('workspace-a', record.id).status).toBe('pending');
    vi.restoreAllMocks();
    const saved = f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', record.id).token });
    expect(saved.status).toBe('saved'); expect(readdirSync(join(f.vault, OBSIDIAN_DESTINATION))).toHaveLength(1);
  });
  it('keeps candidates available with an unconfigured connector and blocks changed destinations', () => {
    const f = fixture(); const service = new KnowledgeService(f.knowledgeRepository, f.workspaces, f.outcomeRepository, new ObsidianConnector());
    const record = service.create('workspace-a', manualKnowledge);
    expect(() => service.preview('workspace-a', record.id)).toThrow(/Set HAN/);
    const preview = f.knowledge.preview('workspace-a', record.id);
    f.knowledgeRepository.save({ ...record, status: 'pending', approvedAt: record.createdAt, destination: { connectorId: preview.connectorId, relativePath: preview.relativePath, destinationId: 'another-vault' } });
    expect(() => f.knowledge.preview('workspace-a', record.id)).toThrow(/different destination/);
  });
});
