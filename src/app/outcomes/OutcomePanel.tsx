import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Artifact, ArtifactKind } from '../../core/outcomes/artifact';
import type { TaskReport } from '../../core/outcomes/taskReport';
import type { Execution } from '../../core/executions/execution';
import type { Task } from '../../core/tasks/task';
import { executionApi } from '../executions/executionApi';
import { taskApi } from '../tasks/taskApi';
import { outcomeApi } from './outcomeApi';

export function OutcomePanel({ workspaceId }: { workspaceId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [taskId, setTaskId] = useState('');
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ArtifactKind>('result');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const preservation = useRef<{ intent: string; creationId: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void Promise.all([taskApi.list(workspaceId), executionApi.list(workspaceId), outcomeApi.listArtifacts(workspaceId), outcomeApi.listReports(workspaceId)])
      .then(([nextTasks, nextExecutions, nextArtifacts, nextReports]) => {
        if (!active) return;
        setTasks(nextTasks); setExecutions(nextExecutions); setArtifacts(nextArtifacts); setReports(nextReports);
        setTaskId((current) => nextTasks.some((task) => task.id === current) ? current : nextTasks[0]?.id ?? '');
      }).catch(() => { if (active) setError('Task outcomes could not be loaded. Check the local runtime and refresh.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, refresh]);

  const task = tasks.find((item) => item.id === taskId);
  const taskExecutions = executions.filter((execution) => execution.taskId === taskId);
  const sources = useMemo(() => taskExecutions.flatMap((execution) => execution.checkpoint.contributions.map((contribution) => ({ execution, contribution, key: `${execution.id}|${contribution.stepId}` }))), [taskExecutions]);
  const taskArtifacts = artifacts.filter((artifact) => artifact.taskId === taskId);
  const report = reports.find((item) => item.task.id === taskId);

  useEffect(() => { setSource((current) => sources.some((item) => item.key === current) ? current : sources[0]?.key ?? ''); }, [taskId, executions]);

  async function preserve(event: FormEvent) {
    event.preventDefault();
    const selected = sources.find((item) => item.key === source);
    if (!task || !selected || busy) return;
    const input = { title, kind, taskId: task.id, sourceExecutionId: selected.execution.id, sourceContributionStepId: selected.contribution.stepId };
    const intent = JSON.stringify([workspaceId, input]);
    if (preservation.current?.intent !== intent) preservation.current = { intent, creationId: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const artifact = await outcomeApi.createArtifact(workspaceId, { ...input, creationId: preservation.current.creationId });
      setArtifacts((current) => [artifact, ...current.filter((item) => item.id !== artifact.id)]); setTitle(''); preservation.current = null;
    } catch { setError('Artifact save is not confirmed. Refresh to inspect saved outcomes, or retry this unchanged form safely.'); }
    finally { setBusy(false); }
  }

  async function generateReport() {
    if (!task) return;
    setBusy(true); setError('');
    try {
      const next = await outcomeApi.generateReport(workspaceId, task.id);
      setReports((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Task Report could not be generated.'); }
    finally { setBusy(false); }
  }

  return <section className="outcome-panel section-block" aria-labelledby="outcomes-heading">
    <h2 id="outcomes-heading">Artifacts &amp; Task Reports</h2>
    <p>Execution output is history. An Artifact is a deliberately preserved formal outcome; a Task Report is a deterministic snapshot of observable Task state.</p>
    <button type="button" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>Refresh Outcomes</button>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading Task outcomes…</p> : tasks.length === 0 ? <p>Create a Task before generating Task outcomes.</p> : <>
      <label htmlFor="outcome-task">Task</label>
      <select id="outcome-task" value={taskId} onChange={(event) => setTaskId(event.target.value)}>{tasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      {task && <div className="outcome-grid">
        <article aria-label="Artifact preservation">
          <h3>Preserve an Artifact</h3>
          <p>Choose one committed contribution. Its content and Agent/backend provenance are copied into an immutable Artifact record.</p>
          {sources.length === 0 ? <p>No committed contribution exists for this Task yet.</p> : <form onSubmit={preserve}>
            <label htmlFor="artifact-source">Execution contribution</label>
            <select id="artifact-source" value={source} onChange={(event) => setSource(event.target.value)}>{sources.map((item) => <option key={item.key} value={item.key}>{item.execution.id} · {item.contribution.stepId} · {item.contribution.agentDisplayName}</option>)}</select>
            <label htmlFor="artifact-title">Artifact title</label><input id="artifact-title" required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} />
            <label htmlFor="artifact-kind">Artifact kind</label><select id="artifact-kind" value={kind} onChange={(event) => setKind(event.target.value as ArtifactKind)}><option value="result">Result</option><option value="document">Document</option><option value="note">Note</option></select>
            <button type="submit" disabled={busy || !title.trim()}>Preserve Artifact</button>
          </form>}
        </article>
        <article aria-label="Task Report generation">
          <h3>Task Report</h3>
          <p>Generated from stored Task, Execution and Artifact records. This is not AI-authored analysis.</p>
          <button type="button" disabled={busy} onClick={() => void generateReport()}>{report ? 'Regenerate Task Report' : 'Generate Task Report'}</button>
          {report && <div className="task-report"><p><strong>{report.outcomeSummary}</strong></p><p>Report ID: {report.id}</p><p>Goal: {report.task.goal}</p><p>Agents: {report.participatingAgents.map((agent) => `${agent.displayName} (${agent.agentId})`).join(', ') || 'None observed'}</p><p>Executions: {report.executions.length} · Artifacts referenced: {report.artifacts.length}</p><p>Generated: {report.updatedAt}</p>{report.limitations.length > 0 && <ul>{report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>}</div>}
        </article>
      </div>}
      <div className="artifact-list" aria-label="Preserved Artifacts"><h3>Preserved Artifacts · {taskArtifacts.length}</h3>{taskArtifacts.length === 0 ? <p>No formal Artifact has been preserved for this Task.</p> : taskArtifacts.map((artifact) => <article key={artifact.id}><h4>{artifact.title}</h4><p>{artifact.kind} · {artifact.id}</p><p className="artifact-content">{artifact.content}</p><small>Task {artifact.taskId} · Execution {artifact.provenance.executionId ?? 'None'} · Step {artifact.provenance.contributionStepId ?? 'None'} · Agent {artifact.provenance.agentDisplayName ?? 'None'} · Provider {artifact.provenance.providerId ?? 'None'} · Model {artifact.provenance.modelId ?? 'None'} · {artifact.provenance.mode?.toUpperCase() ?? 'DIRECT'}</small></article>)}</div>
    </>}
  </section>;
}
