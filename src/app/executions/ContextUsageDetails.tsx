import { useEffect, useState } from 'react';
import type { Execution } from '../../core/executions/execution';
import type { TelemetryRecord } from '../../core/telemetry/telemetry';

export function ContextUsageDetails({ execution }: { execution: Execution }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TelemetryRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true; setLoading(true); setRows([]); setError('');
    void fetch(`/api/workspaces/${encodeURIComponent(execution.workspaceId)}/executions/${encodeURIComponent(execution.id)}/telemetry`).then(async (response) => {
      if (!response.ok) throw new Error();
      const body = await response.json() as { records: TelemetryRecord[] };
      if (!Array.isArray(body.records)) throw new Error();
      if (active) setRows(body.records);
    }).catch(() => { if (active) setError('Context & Usage could not be loaded. Execution state is unchanged; retry inspection.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, execution.workspaceId, execution.id, execution.revision, refresh]);
  const latest = [...new Map(rows.map((row) => [row.invocationId, row])).values()];
  return <details onToggle={(event) => setOpen(event.currentTarget.open)}><summary>Advanced: Context &amp; Usage</summary>
    {open && <>
      <p>Operational telemetry, not authority Audit or billing. Metadata only; no stored context text. Counts use UTF-16 characters and UTF-8 bytes, not estimated provider tokens.</p>
      <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>Refresh Context &amp; Usage</button>
      {execution.checkpoint.contributions.some((item) => item.measurement?.telemetry === 'unconfirmed') && <p role="alert">A contribution succeeded but its final telemetry was not confirmed. No automatic replay occurred.</p>}
      {loading ? <p role="status">Loading Context &amp; Usage…</p> : error ? <p role="alert">{error}</p> : latest.length === 0 ? <p>No recorded invocation telemetry. This may be an unstarted or historical Execution; history is not backfilled.</p> : <ol aria-label="Invocation telemetry">{latest.map((row) => <li key={row.invocationId}>
        <h4>{row.context.scope?.stepId} · {row.agentId}</h4>
        <p>Provider {row.providerId} · Model {row.modelId} · {row.mode.toUpperCase()}</p>
        <p>Result: {row.status === 'started' ? 'In-flight or unconfirmed — no final telemetry recorded' : row.status} · {row.code}</p>
        <p>Invocation: {row.invocationId} · Context: {row.context.id}</p>
        <p>Started: {row.startedAt} · Completed: {row.completedAt ?? 'Unknown'} · Duration: {row.durationMs === null ? 'Unknown' : `${row.durationMs.toFixed(2)} ms`}</p>
        <strong>{row.usage.source === 'synthetic' ? 'MOCK · SYNTHETIC USAGE · NOT BILLING' : row.usage.source === 'unavailable' ? 'Usage unavailable' : 'Provider-reported usage'}</strong>
        <p>Input tokens: {row.usage.inputTokens ?? 'Unknown'} · Output tokens: {row.usage.outputTokens ?? 'Unknown'} · Total tokens: {row.usage.totalTokens ?? 'Unknown'} · Cost: Unknown</p>
        <p>Supplied context: {row.context.inputChars} characters / {row.context.inputBytes} UTF-8 bytes · Limit: {row.context.maxInputChars} characters. Totals include formatting and handoff attribution.</p>
        <ul>{row.context.items.map((item, index) => <li key={index}>{item.kind} · {item.sourceType}/{item.sourceId ?? 'current-request'}{item.sourceStepId ? `/${item.sourceStepId}` : ''} · {item.reason} · {item.delivery} · {item.suppliedChars}/{item.originalChars} characters · {item.truncated ? 'TRUNCATED' : 'not truncated'}</li>)}</ul>
        <p>Omitted / unavailable: {row.context.omitted.join(' · ')}</p>
      </li>)}</ol>}
    </>}
  </details>;
}
