import { describe, expect, it } from 'vitest';
import { OutcomeError } from '../src/application/outcomes/outcomeService.ts';
import { outcomeFixture } from './outcomeFixtures.ts';

describe('Artifact and Task Report application boundary', () => {
  it('deliberately preserves a committed contribution with complete provenance', async () => {
    const f = outcomeFixture();
    try {
      const execution = await f.completedExecution();
      const artifact = f.outcomeService.createArtifact('workspace-a', { title: 'Formal result', kind: 'result', taskId: 'task-a', sourceExecutionId: execution.id, sourceContributionStepId: 'step-2' });
      expect(artifact).toMatchObject({ id: 'outcome-1', workspaceId: 'workspace-a', taskId: 'task-a', title: 'Formal result', kind: 'result', content: execution.checkpoint.contributions[1].output, provenance: { executionId: execution.id, contributionStepId: 'step-2', agentId: 'agent-gemini', agentDisplayName: 'Gemini', providerId: 'mock', modelId: 'mock-basic', mode: 'mock' }, schemaVersion: 1 });
      expect(f.outcomeService.listArtifacts('workspace-a', 'task-a')).toEqual([artifact]);
    } finally { await f.closeOutcomes(); }
  });

  it('validates formal content and rejects uncommitted or contradictory sources', async () => {
    const f = outcomeFixture();
    try {
      const execution = await f.completedExecution();
      expect(() => f.outcomeService.createArtifact('workspace-a', { title: ' ', kind: 'result', content: 'x' })).toThrow(OutcomeError);
      expect(() => f.outcomeService.createArtifact('workspace-a', { title: 'Invalid', kind: 'result', sourceExecutionId: execution.id, sourceContributionStepId: 'missing' })).toThrow(/Committed contribution/);
      expect(() => f.outcomeService.createArtifact('workspace-a', { title: 'Ambiguous', kind: 'result', content: 'manual', sourceExecutionId: execution.id, sourceContributionStepId: 'step-1' })).toThrow(/without separate content/);
      const direct = f.outcomeService.createArtifact('workspace-a', { title: 'Human formal note', kind: 'note', taskId: 'task-a', content: 'Observable human-authored outcome.' });
      expect(direct.provenance.executionId).toBeNull();
    } finally { await f.closeOutcomes(); }
  });

  it('enforces Workspace, Task, and Execution scope integrity', async () => {
    const f = outcomeFixture();
    try {
      const execution = await f.completedExecution();
      const timestamp = '2026-09-16T00:00:00.000Z';
      f.tasks.create({ id: 'task-b', workspaceId: 'workspace-b', sourceChatId: null, title: 'Other', goal: 'Other goal', status: 'draft', createdAt: timestamp, updatedAt: timestamp, completedAt: null, schemaVersion: 1 });
      expect(() => f.outcomeService.listArtifacts('workspace-a', 'task-b')).toThrow(/does not belong/);
      expect(() => f.outcomeService.createArtifact('workspace-b', { title: 'Cross scope', kind: 'result', taskId: 'task-b', sourceExecutionId: execution.id, sourceContributionStepId: 'step-1' })).toThrow(/source Execution/);
      expect(() => f.outcomeService.createArtifact('workspace-a', { title: 'Wrong Task', kind: 'result', taskId: 'task-b', sourceExecutionId: execution.id, sourceContributionStepId: 'step-1' })).toThrow();
    } finally { await f.closeOutcomes(); }
  });

  it('generates one stable deterministic report per Task and refreshes Artifact references', async () => {
    const f = outcomeFixture();
    try {
      const execution = await f.completedExecution();
      const first = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
      expect(first).toMatchObject({ id: 'outcome-1', task: { id: 'task-a', goal: 'Independent Task goal', status: 'draft' }, outcomeSummary: expect.stringContaining('Related Executions: 1 (1 completed)'), executions: [{ id: execution.id, status: 'completed', contributionCount: 2, finalContributionStepId: 'step-2' }], artifacts: [] });
      expect(first.participatingAgents).toEqual([{ agentId: 'agent-gpt', displayName: 'GPT' }, { agentId: 'agent-gemini', displayName: 'Gemini' }]);
      f.outcomeService.createArtifact('workspace-a', { title: 'Preserved', kind: 'document', taskId: 'task-a', sourceExecutionId: execution.id, sourceContributionStepId: 'step-2' });
      const refreshed = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
      expect(refreshed.id).toBe(first.id);
      expect(refreshed.artifacts).toEqual([expect.objectContaining({ title: 'Preserved', sourceExecutionId: execution.id, contributionStepId: 'step-2' })]);
      expect(f.outcomeService.listTaskReports('workspace-a')).toEqual([refreshed]);
    } finally { await f.closeOutcomes(); }
  });

  it('preserves observable failure attribution without inventing synthesis', async () => {
    const f = outcomeFixture();
    try {
      const failed = f.service.create('workspace-a', { goal: 'Fail honestly', participantAgentIds: ['agent-codex'], collaborationMode: 'sequential', pauseAfterStep: false, taskId: 'task-a' });
      f.service.control('workspace-a', failed.id, 'start'); await f.service.waitForIdle(failed.id);
      const report = f.outcomeService.generateTaskReport('workspace-a', 'task-a');
      expect(report.executions[0]).toMatchObject({ status: 'failed', failure: { stepId: 'step-1', agentId: 'agent-codex' } });
      expect(report.limitations[0]).toContain('agent-codex');
      expect(report.outcomeSummary).toContain('1 failed');
    } finally { await f.closeOutcomes(); }
  });
});
