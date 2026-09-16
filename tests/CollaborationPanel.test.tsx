import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CollaborationPanel } from '../src/app/collaboration/CollaborationPanel';
import { MockProviderAdapter } from '../src/adapters/mock/mockProviderAdapter';
import { AgentInvocationService } from '../src/application/agents/agentInvocationService';
import { initialAgentRegistry } from '../src/application/agents/initialAgentRegistry';
import { ProviderAdapterRegistry } from '../src/application/providers/providerAdapterRegistry';
import { OrchestratorService } from '../src/application/collaboration/orchestratorService';
import type { CollaborationRequest } from '../src/core/collaboration/collaboration';
import type { ProviderBinding } from '../src/core/providers/provider';

function installFetch(failSecond = false) {
  const mock = new MockProviderAdapter();
  const adapter = { descriptor: mock.descriptor, async execute(input: Parameters<typeof mock.execute>[0]) { if (failSecond && input.agentId === 'agent-gemini') throw new Error('failure'); return mock.execute(input); } };
  const binding: ProviderBinding = { providerId: 'mock', adapterId: 'mock', modelId: 'mock-basic', status: 'configured' };
  const invocation = new AgentInvocationService(initialAgentRegistry, new ProviderAdapterRegistry([{ descriptor: adapter.descriptor, adapter }]), new Map([['agent-gpt', binding], ['agent-gemini', binding]]));
  const orchestrator = new OrchestratorService(invocation);
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init?.method === 'POST' ? { result: await orchestrator.collaborate(JSON.parse(String(init.body))) } : { targets: invocation.listTargets() })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
afterEach(() => vi.unstubAllGlobals());

describe('Prototype Collaboration UI', () => {
  it.each(['sequential', 'review'])('submits %s with explicit selection and shows ordered Mock contributions, handoff and attributed final', async (mode) => {
    const fetchMock = installFetch();
    render(<CollaborationPanel />);
    expect(screen.getByRole('heading', { name: 'Prototype Collaboration' })).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Run Collaboration' });
    expect(screen.getByLabelText('Selected collaboration order')).toHaveTextContent('GPT → Gemini');
    fireEvent.change(screen.getByLabelText('Collaboration goal'), { target: { value: 'Check bounded collaboration' } });
    fireEvent.change(screen.getByLabelText('Collaboration mode'), { target: { value: mode } });
    fireEvent.click(screen.getByRole('button', { name: 'Run Collaboration' }));
    const final = await screen.findByRole('article', { name: 'Final collaboration contribution' });
    const result = screen.getByLabelText('Collaboration result');
    expect(within(result).getAllByRole('article').map((article) => article.getAttribute('aria-label'))).toEqual(['step-1 GPT contribution', 'step-2 Gemini contribution', 'Final collaboration contribution']);
    expect(within(result).getAllByText('MOCK · TEST CONTRIBUTION')).toHaveLength(2);
    expect(within(final).getByText('MOCK · TEST OUTPUT')).toBeInTheDocument();
    expect(within(final).getByRole('heading')).toHaveTextContent('Final · Gemini · step-2');
    expect(within(result).getByText(/Handoff summary · agent-gpt → agent-gemini/)).toBeInTheDocument();
    const sent = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(sent?.[1]?.body)) as CollaborationRequest).toEqual({ goal: 'Check bounded collaboration', participantAgentIds: ['agent-gpt', 'agent-gemini'], collaborationMode: mode });
  });

  it('allows minimum sufficient single-Agent selection and prevents a one-Agent review', async () => {
    const fetchMock = installFetch(); render(<CollaborationPanel />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Gemini/ }));
    fireEvent.change(screen.getByLabelText('Collaboration goal'), { target: { value: 'One contribution' } });
    fireEvent.change(screen.getByLabelText('Collaboration mode'), { target: { value: 'review' } });
    expect(screen.getByRole('button', { name: 'Run Collaboration' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Collaboration mode'), { target: { value: 'sequential' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run Collaboration' }));
    await screen.findByRole('article', { name: 'Final collaboration contribution' });
    expect(screen.queryByRole('article', { name: 'step-2 Gemini contribution' })).not.toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).participantAgentIds).toEqual(['agent-gpt']);
  });

  it('shows failure and completed contribution without a false final', async () => {
    installFetch(true); render(<CollaborationPanel />);
    await screen.findByRole('button', { name: 'Run Collaboration' });
    fireEvent.change(screen.getByLabelText('Collaboration goal'), { target: { value: 'Fail safely' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run Collaboration' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('provider_request_failed');
    expect(screen.getByRole('article', { name: 'step-1 GPT contribution' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Final collaboration contribution' })).not.toBeInTheDocument();
  });

  it('shows a retryable target API error and distinguishes disabled configuration', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({ targets: [] }))));
    render(<CollaborationPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Retry collaboration targets' }));
    expect(await screen.findByText(/No executable test Agents are configured/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run Collaboration' })).not.toBeInTheDocument();
  });

  it('keeps the goal and reports a transport failure without claiming success', async () => {
    installFetch(); render(<CollaborationPanel />);
    await screen.findByRole('button', { name: 'Run Collaboration' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Collaboration is unavailable.' }), { status: 500 })));
    fireEvent.change(screen.getByLabelText('Collaboration goal'), { target: { value: 'Retain this goal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run Collaboration' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Collaboration is unavailable.');
    expect(screen.getByLabelText('Collaboration goal')).toHaveValue('Retain this goal');
  });
});
