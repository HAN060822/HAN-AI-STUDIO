import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OutcomePanel } from '../src/app/outcomes/OutcomePanel';
import type { Artifact } from '../src/core/outcomes/artifact';
import type { Execution } from '../src/core/executions/execution';
import type { TaskReport } from '../src/core/outcomes/taskReport';
import type { Task } from '../src/core/tasks/task';

const task: Task = { id: 'task-a', workspaceId: 'workspace-a', sourceChatId: null, title: 'Formal outcome Task', goal: 'Preserve a formal outcome.', status: 'completed', createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T01:00:00.000Z', completedAt: '2026-09-16T01:00:00.000Z', schemaVersion: 1 };
const execution: Execution = { id: 'execution-a', workspaceId: 'workspace-a', taskId: 'task-a', runtimeId: 'prototype-local', status: 'completed', plan: { mode: 'sequential', goal: 'Produce output', steps: [{ id: 'step-1', agentId: 'agent-gpt' }] }, checkpoint: { nextStepIndex: 1, currentStepId: null, contributions: [{ agentId: 'agent-gpt', agentDisplayName: 'GPT', stepId: 'step-1', output: 'Formal Mock output', providerId: 'mock', modelId: 'mock-basic', mode: 'mock', status: 'succeeded', handoff: null }] }, pendingControl: null, pauseAfterStep: false, failure: null, createdAt: '2026-09-16T00:10:00.000Z', startedAt: '2026-09-16T00:11:00.000Z', updatedAt: '2026-09-16T00:12:00.000Z', finishedAt: '2026-09-16T00:12:00.000Z', revision: 3, schemaVersion: 1 };

function install(loseFirstArtifactResponse = false) {
  let artifacts: Artifact[] = [];
  let reports: TaskReport[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), 'http://local').pathname;
    if (path.endsWith('/tasks')) return new Response(JSON.stringify({ tasks: [task] }));
    if (path.endsWith('/executions')) return new Response(JSON.stringify({ executions: [execution] }));
    if (path.endsWith('/artifacts') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      const artifact: Artifact = { id: 'artifact-a', workspaceId: 'workspace-a', taskId: task.id, title: body.title, kind: body.kind, content: execution.checkpoint.contributions[0].output, provenance: { executionId: execution.id, contributionStepId: 'step-1', agentId: 'agent-gpt', agentDisplayName: 'GPT', providerId: 'mock', modelId: 'mock-basic', mode: 'mock' }, createdAt: '2026-09-16T02:00:00.000Z', updatedAt: '2026-09-16T02:00:00.000Z', schemaVersion: 1 };
      artifacts = [artifact];
      if (loseFirstArtifactResponse) { loseFirstArtifactResponse = false; throw new Error('Response lost after commit'); }
      return new Response(JSON.stringify({ artifact }), { status: 201 });
    }
    if (path.endsWith('/artifacts')) return new Response(JSON.stringify({ artifacts }));
    if (path.endsWith('/task-reports') && init?.method === 'POST') {
      const report: TaskReport = { id: 'report-a', workspaceId: 'workspace-a', task: { id: task.id, title: task.title, goal: task.goal, status: task.status, createdAt: task.createdAt, updatedAt: task.updatedAt, completedAt: task.completedAt }, outcomeSummary: `Task “${task.title}” is completed. Related Executions: 1 (1 completed). Preserved Artifacts: ${artifacts.length}.`, executions: [{ id: execution.id, status: 'completed', goal: execution.plan.goal, runtimeId: execution.runtimeId, participantAgentIds: ['agent-gpt'], contributionCount: 1, finalContributionStepId: 'step-1', failure: null, createdAt: execution.createdAt, finishedAt: execution.finishedAt }], participatingAgents: [{ agentId: 'agent-gpt', displayName: 'GPT' }], artifacts: artifacts.map((item) => ({ id: item.id, title: item.title, kind: item.kind, sourceExecutionId: execution.id, contributionStepId: 'step-1' })), limitations: [], createdAt: '2026-09-16T02:01:00.000Z', updatedAt: '2026-09-16T02:01:00.000Z', schemaVersion: 1 };
      reports = [report]; return new Response(JSON.stringify({ report }));
    }
    if (path.endsWith('/task-reports')) return new Response(JSON.stringify({ reports }));
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, artifacts: () => artifacts, reports: () => reports };
}
afterEach(() => vi.unstubAllGlobals());

describe('Artifact and Task Report UI', () => {
  it('retries a lost preservation response with the same creation identity and merges a refreshed saved record once', async () => {
    const f = install(true); const view = render(<OutcomePanel workspaceId="workspace-a" />);
    await screen.findByText(/No formal Artifact/);
    fireEvent.change(screen.getByLabelText('Artifact title'), { target: { value: 'Retry-safe result' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preserve Artifact' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('save is not confirmed');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Outcomes' }));
    await screen.findByRole('heading', { name: 'Retry-safe result' });
    fireEvent.click(screen.getByRole('button', { name: 'Preserve Artifact' }));
    await waitFor(() => expect(screen.getByLabelText('Artifact title')).toHaveValue(''));
    const requests = f.fetchMock.mock.calls.filter(([path, init]) => String(path).endsWith('/artifacts') && init?.method === 'POST').map(([, init]) => JSON.parse(String(init?.body)));
    expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0]); expect(requests[0].creationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByRole('heading', { name: 'Preserved Artifacts · 1' })).toBeInTheDocument();
    view.unmount(); render(<OutcomePanel workspaceId="workspace-a" />);
    await screen.findByRole('heading', { name: 'Retry-safe result' });
    expect(f.fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2);
  });
  it('preserves a selected contribution and displays formal provenance separately from raw output', async () => {
    const f = install(); render(<OutcomePanel workspaceId="workspace-a" />);
    await screen.findByText(/No formal Artifact/);
    expect(screen.getByRole('option', { name: /execution-a · step-1 · GPT/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Artifact title'), { target: { value: 'UI formal result' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preserve Artifact' }));
    const list = await screen.findByLabelText('Preserved Artifacts');
    expect(within(list).getByRole('heading', { name: 'UI formal result' })).toBeInTheDocument();
    expect(within(list).getByText('Formal Mock output')).toBeInTheDocument();
    expect(within(list).getByText(/Execution execution-a · Step step-1 · Agent GPT · Provider mock/)).toBeInTheDocument();
    expect(f.artifacts()).toHaveLength(1);
  });

  it('generates an honest deterministic report and reconstructs both outcomes after remount', async () => {
    const f = install(); const first = render(<OutcomePanel workspaceId="workspace-a" />);
    await screen.findByText(/No formal Artifact/);
    fireEvent.change(screen.getByLabelText('Artifact title'), { target: { value: 'Durable result' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preserve Artifact' }));
    await screen.findByRole('heading', { name: 'Durable result' });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Task Report' }));
    expect(await screen.findByText(/Related Executions: 1 \(1 completed\).*Preserved Artifacts: 1/)).toBeInTheDocument();
    expect(screen.getByText('Generated from stored Task, Execution and Artifact records. This is not AI-authored analysis.')).toBeInTheDocument();
    first.unmount(); render(<OutcomePanel workspaceId="workspace-a" />);
    expect(await screen.findByRole('heading', { name: 'Durable result' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate Task Report' })).toBeInTheDocument();
    expect(f.reports()).toHaveLength(1);
  });

  it('surfaces loading errors instead of presenting missing outcomes as success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<OutcomePanel workspaceId="workspace-a" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Task outcomes could not be loaded');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
