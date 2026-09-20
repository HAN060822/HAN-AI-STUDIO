import { createHash, randomUUID } from 'node:crypto';
import { KnowledgeError, knowledgeRequest, knowledgeText, type Knowledge } from '../../core/knowledge/knowledge.ts';
import type { OutcomeRepository } from '../outcomes/outcomeRepository.ts';
import type { WorkspaceRepository } from '../workspaces/workspaceRepository.ts';
import type { KnowledgeConnector } from './knowledgeConnector.ts';
import type { KnowledgeRepository } from './knowledgeRepository.ts';
import type { Actor, ActionIntent } from '../../core/governance/governance.ts';
import type { GovernanceService } from '../governance/governanceService.ts';

export class KnowledgeService {
  private readonly records: KnowledgeRepository;
  private readonly workspaces: WorkspaceRepository;
  private readonly outcomes: OutcomeRepository;
  private readonly connector: KnowledgeConnector;
  private readonly governance: GovernanceService;
  constructor(records: KnowledgeRepository, workspaces: WorkspaceRepository, outcomes: OutcomeRepository, connector: KnowledgeConnector, governance: GovernanceService) {
    this.records = records; this.workspaces = workspaces; this.outcomes = outcomes; this.connector = connector; this.governance = governance;
  }
  private requireWorkspace(workspaceId: string) {
    if (!this.workspaces.getById(workspaceId)) throw new KnowledgeError('not_found', 'Workspace was not found.');
  }
  list(workspaceId: string): Knowledge[] { this.requireWorkspace(workspaceId); return this.records.listForWorkspace(workspaceId); }
  get(workspaceId: string, id: string): Knowledge {
    this.requireWorkspace(workspaceId);
    const record = this.records.getById(id);
    if (!record || record.workspaceId !== workspaceId) throw new KnowledgeError('not_found', 'Knowledge was not found in this Workspace.');
    return record;
  }
  create(workspaceId: string, value: unknown): Knowledge {
    this.requireWorkspace(workspaceId);
    const input = knowledgeRequest(value);
    let title = input.title ?? '';
    let content = input.content ?? '';
    let source: Knowledge['source'] = { type: 'manual', id: null, taskId: null, executionId: null, sourceUpdatedAt: null };
    if (input.sourceType === 'artifact') {
      const artifact = this.outcomes.getArtifactById(input.sourceId!);
      if (!artifact || artifact.workspaceId !== workspaceId) throw new KnowledgeError('not_found', 'Artifact was not found in this Workspace.');
      title = artifact.title; content = artifact.content;
      source = { type: 'artifact', id: artifact.id, taskId: artifact.taskId, executionId: artifact.provenance.executionId, sourceUpdatedAt: artifact.updatedAt };
    } else if (input.sourceType === 'task-report') {
      const report = this.outcomes.getTaskReportById(input.sourceId!);
      if (!report || report.workspaceId !== workspaceId) throw new KnowledgeError('not_found', 'Task Report was not found in this Workspace.');
      title = report.task.title;
      content = [report.outcomeSummary, `Goal: ${report.task.goal}`, `Task state: ${report.task.status}`, 'Deterministic report snapshot; not AI-authored analysis.',
        'Related Executions:', ...report.executions.map((item) => `- ${item.id}: ${item.status}; ${item.contributionCount} contributions`),
        'Agents:', ...report.participatingAgents.map((item) => `- ${item.displayName} (${item.agentId})`),
        'Artifacts:', ...report.artifacts.map((item) => `- ${item.title} (${item.id})`),
        'Reported limitations:', ...(report.limitations.length ? report.limitations : ['None recorded.']), `Report snapshot: ${report.updatedAt}`].join('\n\n');
      source = { type: 'task-report', id: report.id, taskId: report.task.id, executionId: null, sourceUpdatedAt: report.updatedAt };
    }
    const timestamp = new Date().toISOString();
    return this.records.create({ id: randomUUID(), workspaceId, title: knowledgeText(title, 'Title', 180), content: knowledgeText(content, 'Content', 100_000), source,
      status: 'candidate', destination: null, failure: null, createdAt: timestamp, updatedAt: timestamp, approvedAt: null, savedAt: null, revision: 0, schemaVersion: 1 });
  }
  preview(workspaceId: string, id: string) {
    const record = this.get(workspaceId, id);
    const preview = this.connector.preview(record);
    if (record.destination && (record.destination.destinationId !== preview.destinationId || record.destination.relativePath !== preview.relativePath || record.destination.connectorId !== preview.connectorId)) {
      throw new KnowledgeError('destination_changed', 'This candidate was approved for a different destination. Restore that configuration before retrying.');
    }
    const token = createHash('sha256').update(JSON.stringify([record, preview])).digest('hex');
    return { ...preview, token };
  }
  private publicationIntent(workspaceId: string, id: string, preview = this.preview(workspaceId, id)): ActionIntent {
    return { action: 'EXTERNAL', resource: { type: 'knowledge', id }, scope: { kind: 'workspace', workspaceId }, consequence: { capability: `${preview.connectorId}.publish`, destinationId: preview.destinationId, fingerprint: preview.token } };
  }
  review(actor: Actor | null, workspaceId: string, id: string) {
    const preview = this.preview(workspaceId, id);
    return { ...preview, decision: this.governance.decide(actor, this.publicationIntent(workspaceId, id, preview)) };
  }
  governanceState(actor: Actor | null, workspaceId: string, id: string) {
    this.get(workspaceId, id);
    const events = this.governance.history(actor, workspaceId, id);
    return { decision: this.governance.decide(actor, this.publicationIntent(workspaceId, id)), events };
  }
  audit(actor: Actor | null, workspaceId: string, id: string) {
    this.get(workspaceId, id); return this.governance.history(actor, workspaceId, id);
  }
  save(actor: Actor | null, workspaceId: string, id: string, value: unknown): Knowledge {
    const body = value as Record<string, unknown> | null;
    if (!body || (body.approved !== undefined && typeof body.approved !== 'boolean') || typeof body.previewToken !== 'string' || Object.keys(body).some((key) => !['approved', 'previewToken'].includes(key))) {
      throw new KnowledgeError('approval_required', 'Review the preview and explicitly approve saving this Knowledge.');
    }
    const record = this.get(workspaceId, id);
    const preview = this.preview(workspaceId, id);
    if (body.previewToken !== preview.token) throw new KnowledgeError('stale_preview', 'The candidate or destination changed. Refresh and review the preview before saving.');
    return this.governance.run(actor, this.publicationIntent(workspaceId, id, preview), body.approved === true, () => {
      const value = this.saveApprovedRecord(record, preview);
      return { value, outcome: value.status === 'saved' ? 'succeeded' : 'failed', code: value.status === 'saved' ? 'ok' : 'connector_failed' };
    });
  }
  private saveApprovedRecord(record: Knowledge, preview: ReturnType<KnowledgeService['preview']>): Knowledge {
    if (record.status === 'saved') {
      if (!this.connector.verify(record).matches) throw new KnowledgeError('note_changed', 'The saved note is missing or changed. No file was overwritten; inspect it in the vault.');
      return record;
    }
    const approvedAt = record.approvedAt ?? new Date().toISOString();
    record = this.records.save({ ...record, status: 'pending', approvedAt, updatedAt: new Date().toISOString(), failure: null,
      destination: { connectorId: preview.connectorId, destinationId: preview.destinationId, relativePath: preview.relativePath } });
    try {
      this.connector.publish(record);
    } catch (error) {
      const failure = error instanceof KnowledgeError ? { code: error.code, message: error.message } : { code: 'write_failed', message: 'The connector could not save the note. The candidate and source remain available; review and retry.' };
      return this.records.save({ ...record, status: 'failed', failure, updatedAt: new Date().toISOString() });
    }
    // If this write fails, the durable pending intent and stable note allow an explicit retry.
    return this.records.save({ ...record, status: 'saved', savedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), failure: null });
  }
  verify(workspaceId: string, id: string) {
    const record = this.get(workspaceId, id);
    if (record.status !== 'saved') throw new KnowledgeError('not_saved', 'This Knowledge has no confirmed saved note.');
    this.preview(workspaceId, id);
    return this.connector.verify(record);
  }
}
