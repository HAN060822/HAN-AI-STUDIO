/// <reference types="node" />
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExecutionPanel } from '../src/app/executions/ExecutionPanel';
import { executionFixture, executionInput, deferred } from './executionFixtures';
import { MockProviderAdapter } from '../src/adapters/mock/mockProviderAdapter';
import type { ExecutionAction } from '../src/core/executions/execution';
import type { ProviderResponse } from '../src/core/providers/provider';

const fixtures: ReturnType<typeof executionFixture>[] = [];
function install(f = executionFixture()) {
  fixtures.push(f);
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/invocation-targets')) return new Response(JSON.stringify({ targets: [{ agentId: 'agent-gpt', displayName: 'GPT', backendMode: 'mock', providerId: 'mock', modelId: 'mock-basic' }, { agentId: 'agent-gemini', displayName: 'Gemini', backendMode: 'mock', providerId: 'mock', modelId: 'mock-basic' }] }));
    if (url.endsWith('/tasks')) return new Response(JSON.stringify({ tasks: f.tasks.listForWorkspace('workspace-a') }));
    if (init?.method !== 'POST') return new Response(JSON.stringify({ executions: f.service.list('workspace-a') }));
    const body = JSON.parse(String(init.body));
    const match = url.match(/executions\/([^/]+)\/controls/);
    const execution = match ? f.service.control('workspace-a', match[1], body.action as ExecutionAction) : f.service.create('workspace-a', body);
    return new Response(JSON.stringify({ execution }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return { ...f, fetchMock };
}
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const f of fixtures.splice(0)) await f.close(); });
async function create() {
  await screen.findByText('No Executions yet.');
  fireEvent.change(screen.getByLabelText(/Execution goal/), { target: { value: 'UI execution proof' } });
  fireEvent.change(screen.getByLabelText('Linked Task (optional)'), { target: { value: 'task-a' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Execution' }));
  await screen.findByRole('heading', { name: 'Execution · created' });
}

describe('Prototype Execution UI', () => {
  it('keeps default setup readable while Advanced choices stay usable and a short Task goal fills an empty draft', async () => {
    const f = install(); render(<ExecutionPanel workspaceId="workspace-a" />);
    await screen.findByText('No Executions yet.');
    expect(screen.getByLabelText('Execution collaboration mode')).not.toBeVisible();
    expect(screen.getByLabelText('Execution setup')).toHaveTextContent('GPT → Gemini · Sequential · Pauses between steps');
    fireEvent.change(screen.getByLabelText('Linked Task (optional)'), { target: { value: 'task-a' } });
    expect(screen.getByLabelText(/Execution goal/)).toHaveValue('Independent Task goal');
    fireEvent.click(screen.getByText('Advanced: Execution setup'));
    expect(screen.getByLabelText('Execution collaboration mode')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Execution collaboration mode'), { target: { value: 'review' } });
    fireEvent.click(screen.getByLabelText(/Pause after each completed step/));
    expect(screen.getByLabelText('Execution setup')).toHaveTextContent('Review / Challenge · Runs all steps');
    fireEvent.click(screen.getByRole('button', { name: 'Create Execution' }));
    await screen.findByRole('heading', { name: 'Execution · created' });
    expect(f.service.list('workspace-a')[0]).toMatchObject({ status: 'created', taskId: 'task-a', pauseAfterStep: false, plan: { mode: 'review', goal: 'Independent Task goal' } });
    expect(f.telemetry.list('workspace-a', f.service.list('workspace-a')[0].id)).toEqual([]);
  });

  it('does not truncate a long Task goal or overwrite a human-authored Execution goal', async () => {
    const f = install(); const task = f.tasks.getById('task-a')!; f.tasks.save({ ...task, goal: 'x'.repeat(501) });
    render(<ExecutionPanel workspaceId="workspace-a" />); await screen.findByText('No Executions yet.');
    fireEvent.change(screen.getByLabelText('Linked Task (optional)'), { target: { value: 'task-a' } });
    expect(screen.getByLabelText(/Execution goal/)).toHaveValue('');
    fireEvent.change(screen.getByLabelText(/Execution goal/), { target: { value: 'Explicit bounded goal' } });
    fireEvent.change(screen.getByLabelText('Linked Task (optional)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Linked Task (optional)'), { target: { value: 'task-a' } });
    expect(screen.getByLabelText(/Execution goal/)).toHaveValue('Explicit bounded goal');
    expect(f.tasks.getById('task-a')?.goal).toHaveLength(501);
  });

  it('keeps telemetry uncertainty visible in Normal without presenting a terminal retry control', async () => {
    const f = install(); const append = f.telemetry.append.bind(f.telemetry);
    vi.spyOn(f.telemetry, 'append').mockImplementation((record) => { if (record.phase === 'final') throw new Error('test-only disk fault'); append(record); });
    const row = f.service.create('workspace-a', { ...executionInput, participantAgentIds: ['agent-gpt'] });
    f.service.control('workspace-a', row.id, 'start'); await f.service.waitForIdle(row.id);
    render(<ExecutionPanel workspaceId="workspace-a" />);
    await screen.findByRole('heading', { name: 'Execution · completed' });
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('usage evidence is unconfirmed');
    expect(screen.getByText('Inspect Execution checkpoint').closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('button', { name: 'Resume Execution' })).not.toBeInTheDocument();
    expect(screen.getByText('MOCK · TEST CONTRIBUTION')).toBeVisible();
  });

  it('explains a configured-none backend while preserving inspectable existing work', async () => {
    const f = install(); const row = f.service.create('workspace-a', executionInput); const fetchMock = f.fetchMock;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => url.endsWith('/invocation-targets') ? Promise.resolve(Response.json({ targets: [] })) : fetchMock(url, init)));
    render(<ExecutionPanel workspaceId="workspace-a" />);
    await screen.findByRole('heading', { name: 'Execution · created' });
    expect(screen.getByText(/No executable backend is configured/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create Execution' })).toBeDisabled();
    fireEvent.click(screen.getByText('Inspect Execution checkpoint'));
    expect(screen.getByText(`ID: ${row.id}`)).toBeVisible();
  });

  it('creates, starts, observes a safe-boundary pause, resumes and displays attributed completed output', async () => {
    const f = install(); render(<ExecutionPanel workspaceId="workspace-a" />); await create();
    expect(screen.getByText('Linked Task: task-a')).not.toBeVisible();
    fireEvent.click(screen.getByText('Inspect Execution checkpoint'));
    expect(screen.getByText('Linked Task: task-a')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Start Execution' }));
    await screen.findByRole('heading', { name: 'Execution · paused' });
    expect(screen.getByText('Completed steps: 1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'step-1 · GPT' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'step-2 · Gemini' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume Execution' }));
    await screen.findByRole('heading', { name: 'Execution · completed' });
    expect(screen.getByText('Final contribution: Gemini · step-2')).toBeInTheDocument();
    expect(screen.getAllByText('MOCK · TEST CONTRIBUTION')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Resume Execution' })).not.toBeInTheDocument();
    expect(f.tasks.getById('task-a')?.status).toBe('draft');
  });

  it('cancels paused work and reconstructs the same contribution on UI remount', async () => {
    install(); const first = render(<ExecutionPanel workspaceId="workspace-a" />); await create();
    fireEvent.click(screen.getByRole('button', { name: 'Start Execution' }));
    await screen.findByRole('heading', { name: 'Execution · paused' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Execution' }));
    await screen.findByRole('heading', { name: 'Execution · cancelled' });
    first.unmount(); render(<ExecutionPanel workspaceId="workspace-a" />);
    await screen.findByRole('heading', { name: 'Execution · cancelled' });
    expect(screen.getByRole('heading', { name: 'step-1 · GPT' })).toBeInTheDocument();
    expect(screen.getByText(/No completed final result/)).toBeInTheDocument();
  });

  it('shows an in-flight pause as pending, not a suspended provider call', async () => {
    const entered = deferred<void>(); const output = deferred<ProviderResponse<unknown>>(); const mock = new MockProviderAdapter();
    install(executionFixture({ descriptor: mock.descriptor, async execute() { entered.resolve(); return output.promise; } }));
    render(<ExecutionPanel workspaceId="workspace-a" />); await create();
    fireEvent.click(screen.getByRole('button', { name: 'Start Execution' }));
    await screen.findByRole('heading', { name: 'Execution · running' }); await entered.promise;
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Pause Execution' }));
      expect(await screen.findByText(/pause requested — waiting/)).toHaveTextContent('provider call is not suspended');
      expect(screen.queryByRole('button', { name: 'Resume Execution' })).not.toBeInTheDocument();
    } finally { await act(async () => { output.resolve(await mock.execute({ agentId: 'agent-gpt', input: 'Held Mock output' })); }); }
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Executions' }));
    await screen.findByRole('heading', { name: 'Execution · paused' });
  });

  it('displays recoverable loading failures without pretending data loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<ExecutionPanel workspaceId="workspace-a" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Execution data could not be loaded');
    expect(screen.getByRole('button', { name: 'Refresh Executions' })).toBeEnabled();
  });

  it('reports a failed control and retains the last confirmed state', async () => {
    install(); render(<ExecutionPanel workspaceId="workspace-a" />); await create();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Execution changed; reload.' }), { status: 409 })));
    fireEvent.click(screen.getByRole('button', { name: 'Start Execution' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Execution changed; reload.');
    expect(within(screen.getByRole('article', { name: 'Execution detail' })).getByRole('heading')).toHaveTextContent('created');
    expect(screen.getByRole('button', { name: 'Start Execution' })).toBeDisabled();
  });
});
