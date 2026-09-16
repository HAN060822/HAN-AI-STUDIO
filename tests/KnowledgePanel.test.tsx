import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KnowledgePanel } from '../src/app/knowledge/KnowledgePanel';
import type { Knowledge } from '../src/core/knowledge/knowledge';

function install(options: { previewError?: boolean; failSaveOnce?: boolean } = {}) {
  let record: Knowledge | undefined;
  let failures = options.failSaveOnce ? 1 : 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.endsWith('/artifacts')) return Response.json({ artifacts: [{ id: 'artifact-a', title: 'Selected Artifact' }] });
    if (path.endsWith('/task-reports')) return Response.json({ reports: [{ id: 'report-a', task: { title: 'Selected Report' } }] });
    if (path.endsWith('/knowledge') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      record = { id: 'knowledge-a', workspaceId: 'workspace-a', title: body.title ?? 'Selected snapshot', content: body.content ?? 'Reviewed source snapshot', source: { type: body.sourceType, id: body.sourceId ?? null, taskId: null, executionId: null, sourceUpdatedAt: null }, status: 'candidate', destination: null, failure: null, approvedAt: null, savedAt: null, createdAt: '2026-09-17T00:00:00.000Z', updatedAt: '2026-09-17T00:00:00.000Z', revision: 0, schemaVersion: 1 };
      return Response.json({ record });
    }
    if (path.endsWith('/knowledge')) return Response.json({ records: record ? [record] : [] });
    if (path.endsWith('/preview')) return options.previewError ? Response.json({ error: 'Configure the vault first.' }, { status: 503 }) : Response.json({ preview: { connectorId: 'obsidian-markdown', destinationId: 'vault-id', destinationLabel: 'Temporary vault', relativePath: 'Knowledge/AI-Studio-Generated/knowledge-a.md', markdown: '# Reviewed snapshot', token: `review-${record?.revision}` } });
    if (path.endsWith('/save') && record) {
      record = { ...record, revision: record.revision + 1, status: failures-- > 0 ? 'failed' : 'saved', approvedAt: record.createdAt, destination: { connectorId: 'obsidian-markdown', destinationId: 'vault-id', relativePath: 'Knowledge/AI-Studio-Generated/knowledge-a.md' } };
      if (record.status === 'failed') { record = { ...record, failure: { code: 'write_failed', message: 'Disk unavailable.' } }; return Response.json({ record, error: 'Disk unavailable.' }, { status: 503 }); }
      record = { ...record, failure: null, savedAt: record.createdAt }; return Response.json({ record });
    }
    if (path.endsWith('/verify')) return Response.json({ verification: { matches: true } });
    return Response.json({ record });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, saves: () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/save')) };
}
async function prepare(sourceType = 'manual') {
  await screen.findByText('No Knowledge candidates yet.');
  fireEvent.change(screen.getByLabelText('Knowledge source'), { target: { value: sourceType } });
  if (sourceType === 'manual') {
    fireEvent.change(screen.getByLabelText('Knowledge title'), { target: { value: 'Reviewed manual note' } });
    fireEvent.change(screen.getByLabelText('Knowledge content'), { target: { value: 'Useful content only' } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Prepare for Review' }));
}
afterEach(() => vi.unstubAllGlobals());
describe('Knowledge review UI', () => {
  it('does not export until explicit approval, shows saved path, verifies and reloads saved history', async () => {
    const f = install(); const first = render(<KnowledgePanel workspaceId="workspace-a" />);
    await prepare();
    const save = await screen.findByRole('button', { name: 'Save Reviewed Knowledge' });
    expect(save).toBeDisabled(); expect(f.saves()).toHaveLength(0);
    expect(screen.getByText(/Note path: Knowledge\/AI-Studio-Generated/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox')); expect(save).toBeEnabled(); fireEvent.click(save);
    const verify = await screen.findByRole('button', { name: 'Verify Saved Note' });
    expect(f.saves()).toHaveLength(1);
    expect(JSON.parse(String(f.saves()[0][1]?.body))).toEqual({ approved: true, previewToken: 'review-0' });
    fireEvent.click(verify); await screen.findByText(/Verified: the Markdown note matches/);
    first.unmount(); render(<KnowledgePanel workspaceId="workspace-a" />);
    await screen.findByRole('button', { name: 'Verify Saved Note' });
    expect(screen.getByRole('heading', { name: 'Reviewed manual note' })).toBeInTheDocument(); expect(f.saves()).toHaveLength(1);
  });
  it.each(['artifact', 'task-report'])('prepares only the selected %s reference and does not save automatically', async (sourceType) => {
    const f = install(); render(<KnowledgePanel workspaceId="workspace-a" />); await prepare(sourceType);
    await screen.findByRole('checkbox'); expect(f.saves()).toHaveLength(0);
    const create = f.fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/knowledge') && init?.method === 'POST');
    expect(JSON.parse(String(create?.[1]?.body))).toEqual({ sourceType, sourceId: sourceType === 'artifact' ? 'artifact-a' : 'report-a' });
  });
  it('retains failed state and requires a new approval before retry', async () => {
    const f = install({ failSaveOnce: true }); render(<KnowledgePanel workspaceId="workspace-a" />); await prepare();
    fireEvent.click(await screen.findByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Save Reviewed Knowledge' }));
    const retry = await screen.findByRole('button', { name: 'Retry Reviewed Save' });
    expect(retry).toBeDisabled(); expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByText('Last save failed: Disk unavailable.')).toBeInTheDocument(); expect(f.saves()).toHaveLength(1);
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(retry);
    await screen.findByRole('button', { name: 'Verify Saved Note' }); expect(f.saves()).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('visibly blocks save when preview configuration fails without losing the candidate', async () => {
    const f = install({ previewError: true }); render(<KnowledgePanel workspaceId="workspace-a" />); await prepare();
    expect(await screen.findByRole('alert')).toHaveTextContent('Configure the vault first. Candidate retained');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(f.saves()).toHaveLength(0);
  });
  it('reports initial API failure and allows refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); render(<KnowledgePanel workspaceId="workspace-a" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Knowledge could not be loaded');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Knowledge' })).toBeEnabled());
  });
});
