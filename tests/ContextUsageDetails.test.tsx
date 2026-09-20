import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextUsageDetails } from '../src/app/executions/ContextUsageDetails';
import { executionFixture, executionInput } from './executionFixtures';

const fixtures: ReturnType<typeof executionFixture>[] = [];
afterEach(async () => { vi.unstubAllGlobals(); for (const f of fixtures.splice(0)) await f.close(); });
async function setup() {
  const f = executionFixture(); fixtures.push(f); const row = f.service.create('workspace-a', { ...executionInput, participantAgentIds: ['agent-gpt'] });
  f.service.control('workspace-a', row.id, 'start'); await f.service.waitForIdle(row.id);
  return { row: f.service.get('workspace-a', row.id), events: f.telemetry.list('workspace-a', row.id) };
}
function expand() { fireEvent.click(screen.getByText('Advanced: Context & Usage')); }
describe('Collapsed Context & Usage inspection', () => {
  it('loads only on demand and labels synthetic counters, metadata, identity and unknown cost', async () => {
    const { row, events } = await setup(); const fetchMock = vi.fn().mockResolvedValue(Response.json({ records: events })); vi.stubGlobal('fetch', fetchMock);
    render(<ContextUsageDetails execution={row} />); expect(fetchMock).not.toHaveBeenCalled(); expand();
    await screen.findByText('MOCK · SYNTHETIC USAGE · NOT BILLING');
    expect(screen.getByText(/Provider mock · Model mock-basic/)).toBeInTheDocument(); expect(screen.getByText(/Cost: Unknown/)).toBeInTheDocument();
    expect(screen.getByText(/Supplied context:/)).toBeInTheDocument(); expect(screen.queryByText(row.plan.goal)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/workspaces/workspace-a/executions/${row.id}/telemetry`);
  });
  it('shows unmatched start as uncertain, not success or invented zero usage', async () => {
    const { row, events } = await setup(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ records: [events[0]] })));
    render(<ContextUsageDetails execution={row} />); expand();
    await screen.findByText(/In-flight or unconfirmed/); expect(screen.getByText('Usage unavailable')).toBeInTheDocument(); expect(screen.getByText(/Input tokens: Unknown/)).toBeInTheDocument();
  });
  it('shows read failure with a retry and does not pretend missing history is empty', async () => {
    const { row, events } = await setup(); const fetchMock = vi.fn().mockRejectedValueOnce(new Error('private connection detail')).mockResolvedValueOnce(Response.json({ records: events })); vi.stubGlobal('fetch', fetchMock);
    render(<ContextUsageDetails execution={row} />); expand();
    expect(await screen.findByRole('alert')).toHaveTextContent('Context & Usage could not be loaded');
    expect(screen.queryByText(/No recorded invocation telemetry/)).not.toBeInTheDocument(); expect(screen.queryByText(/private connection/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Context & Usage' }));
    await screen.findByText('MOCK · SYNTHETIC USAGE · NOT BILLING');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
