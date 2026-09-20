import { type FormEvent, useEffect, useState } from 'react';
import type { Knowledge, KnowledgeSourceType } from '../../core/knowledge/knowledge';
import type { Artifact } from '../../core/outcomes/artifact';
import type { TaskReport } from '../../core/outcomes/taskReport';
import { outcomeApi } from '../outcomes/outcomeApi';
import { knowledgeApi, type ReviewPreview } from './knowledgeApi';
import { GovernanceDetails } from './GovernanceDetails';

export function KnowledgePanel({ workspaceId }: { workspaceId: string }) {
  const [records, setRecords] = useState<Knowledge[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [selected, setSelected] = useState('');
  const [sourceType, setSourceType] = useState<KnowledgeSourceType>('artifact');
  const [sourceId, setSourceId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [preview, setPreview] = useState<ReviewPreview | null>(null);
  const [approved, setApproved] = useState(false);
  const [verification, setVerification] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [auditRefresh, setAuditRefresh] = useState(0);
  const record = records.find((item) => item.id === selected);
  const sources = sourceType === 'artifact' ? artifacts.map((item) => ({ id: item.id, title: item.title })) : reports.map((item) => ({ id: item.id, title: item.task.title }));
  const chosenSource = sources.some((item) => item.id === sourceId) ? sourceId : sources[0]?.id ?? '';

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void Promise.all([knowledgeApi.list(workspaceId), outcomeApi.listArtifacts(workspaceId), outcomeApi.listReports(workspaceId)])
      .then(([rows, nextArtifacts, nextReports]) => {
        if (!active) return;
        setRecords(rows); setArtifacts(nextArtifacts); setReports(nextReports);
        setSelected((id) => rows.some((row) => row.id === id) ? id : rows[0]?.id ?? '');
      }).catch(() => { if (active) setError('Knowledge could not be loaded. Refresh to retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, refresh]);

  useEffect(() => {
    let active = true;
    setPreview(null); setApproved(false); setPreviewError(''); setVerification('');
    if (record) void knowledgeApi.preview(workspaceId, record.id).then((next) => { if (active) setPreview(next); })
      .catch((reason) => { if (active) setPreviewError(reason instanceof Error ? reason.message : 'Preview unavailable.'); });
    return () => { active = false; };
  }, [workspaceId, record, refresh]);

  function merge(next: Knowledge) { setRecords((rows) => [next, ...rows.filter((row) => row.id !== next.id)]); }
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const next = await knowledgeApi.create(workspaceId, sourceType === 'manual' ? { sourceType, title, content } : { sourceType, sourceId: chosenSource });
      merge(next); setSelected(next.id); setTitle(''); setContent('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Candidate could not be created.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!record || !preview || !approved) return;
    setBusy(true); setError(''); setApproved(false);
    try { merge(await knowledgeApi.save(workspaceId, record.id, preview.token)); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save is not confirmed.');
      try { merge(await knowledgeApi.get(workspaceId, record.id)); } catch { setPreview(null); }
    } finally { setBusy(false); setAuditRefresh((value) => value + 1); }
  }
  async function verify() {
    if (!record) return;
    setBusy(true); setVerification(''); setError('');
    try { const result = await knowledgeApi.verify(workspaceId, record.id); setVerification(result.matches ? 'Verified: the Markdown note matches this Knowledge record.' : 'The note is missing or changed. No file was overwritten.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Verification failed.'); }
    finally { setBusy(false); }
  }

  return <section className="knowledge-panel section-block" aria-labelledby="knowledge-heading">
    <h2 id="knowledge-heading">Reviewed Knowledge</h2>
    <p>Select reusable information, review the candidate, then explicitly approve saving it to Obsidian.</p>
    <button type="button" disabled={busy || loading} onClick={() => setRefresh((value) => value + 1)}>Refresh Knowledge</button>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading Knowledge…</p> : <>
      <form onSubmit={create}><fieldset disabled={busy || !!error}>
        <legend>Prepare a candidate</legend>
        <label htmlFor="knowledge-source-type">Knowledge source</label><select id="knowledge-source-type" value={sourceType} onChange={(event) => { setSourceType(event.target.value as KnowledgeSourceType); setSourceId(''); }}><option value="artifact">Artifact</option><option value="task-report">Task Report</option><option value="manual">Manual Knowledge</option></select>
        {sourceType === 'manual' ? <><label htmlFor="knowledge-title">Knowledge title</label><input id="knowledge-title" maxLength={180} required value={title} onChange={(event) => setTitle(event.target.value)} /><label htmlFor="knowledge-content">Knowledge content</label><textarea id="knowledge-content" maxLength={100000} required value={content} onChange={(event) => setContent(event.target.value)} /></> : <><label htmlFor="knowledge-source">Selected outcome</label><select id="knowledge-source" value={chosenSource} onChange={(event) => setSourceId(event.target.value)}><option value="" disabled>Select an outcome</option>{sources.map((item) => <option value={item.id} key={item.id}>{item.title} · {item.id}</option>)}</select>{sources.length === 0 && <p>No source outcomes yet. Preserve an Artifact or generate a Task Report, then refresh Knowledge.</p>}</>}
        <button type="submit" disabled={sourceType !== 'manual' && !chosenSource}>Prepare for Review</button>
        <p>Preparing a candidate saves it in AI Studio only. No vault file is created.</p>
      </fieldset></form>
      <div className="knowledge-list" aria-label="Knowledge history">{records.length === 0 ? <p>No Knowledge candidates yet.</p> : records.map((item) => <button key={item.id} disabled={busy} type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.title} · {item.status} · {item.id}</button>)}</div>
      {record && <article aria-label="Knowledge review">
        <h3>{record.title}</h3><p>Knowledge ID: {record.id} · Status: {record.status}</p>
        <p>Source: {record.source.type} · {record.source.id ?? 'Manually entered'} · Task: {record.source.taskId ?? 'None'}</p>
        <p>Created: {record.createdAt} · Updated: {record.updatedAt} · Saved: {record.savedAt ?? 'Not confirmed'}</p>
        <pre className="knowledge-content">{record.content}</pre>
        {record.failure && <p role="alert">Last save failed: {record.failure.message}</p>}
        {previewError && <p role="alert">{previewError} Candidate retained in AI Studio.</p>}
        {preview && <><p>Obsidian vault: {preview.destinationLabel}</p><p>Note path: {preview.relativePath}</p><details><summary>Markdown preview</summary><pre className="knowledge-content">{preview.markdown}</pre></details>
          {record.status === 'saved' ? <><p>Saved to Obsidian. Verification reads the existing note.</p><button type="button" disabled={busy} onClick={() => void verify()}>Verify Saved Note</button></> : <><p role={preview.decision.status === 'denied' ? 'alert' : undefined}>Authority: {preview.decision.status} · {preview.decision.reason}</p><p>Saving creates this note once. Approval covers this exact content, destination and one publication attempt. Required audit evidence is recorded before the connector runs. Retry needs fresh approval and never overwrites a different note.</p><label><input type="checkbox" checked={approved} disabled={busy || preview.decision.status === 'denied'} onChange={(event) => setApproved(event.target.checked)} /> I reviewed this content and destination and approve saving to Obsidian.</label><button type="button" disabled={!approved || busy || preview.decision.status === 'denied'} onClick={() => void save()}>{record.status === 'candidate' ? 'Save Reviewed Knowledge' : 'Retry Reviewed Save'}</button></>}
        </>}
        {verification && <p role="status">{verification}</p>}
        <GovernanceDetails workspaceId={workspaceId} knowledgeId={record.id} refresh={`${record.revision}:${refresh}:${auditRefresh}`} />
      </article>}
    </>}
  </section>;
}
