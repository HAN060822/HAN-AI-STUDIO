import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { AgentId } from '../../core/agents/agent';
import type { AgentInvocationTarget } from '../../application/agents/agentInvocationService';
import type { CollaborationMode } from '../../core/collaboration/collaboration';
import { isTerminalExecution, type Execution, type ExecutionAction } from '../../core/executions/execution';
import type { Task } from '../../core/tasks/task';
import { listInvocationTargets } from '../agents/agentInvocationApi';
import { taskApi } from '../tasks/taskApi';
import { executionApi } from './executionApi';

export function ExecutionPanel({ workspaceId }: { workspaceId: string }) {
  const [rows, setRows] = useState<Execution[]>([]);
  const [selected, setSelected] = useState('');
  const [targets, setTargets] = useState<readonly AgentInvocationTarget[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [participants, setParticipants] = useState<AgentId[]>([]);
  const [goal, setGoal] = useState('');
  const [taskId, setTaskId] = useState('');
  const [mode, setMode] = useState<CollaborationMode>('sequential');
  const [pauseAfterStep, setPauseAfterStep] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const execution = rows.find((row) => row.id === selected);

  function merge(next: Execution) {
    setRows((current) => [next, ...current.filter((row) => row.id !== next.id)].map((row) => {
      const existing = current.find((item) => item.id === row.id);
      return existing && existing.revision > row.revision ? existing : row;
    }));
  }

  useEffect(() => {
    const current = ++generation.current;
    setLoading(true); setError('');
    void Promise.all([executionApi.list(workspaceId), listInvocationTargets(), taskApi.list(workspaceId)]).then(([executions, nextTargets, nextTasks]) => {
      if (generation.current !== current) return;
      setRows(executions); setTargets(nextTargets); setTasks(nextTasks);
      setParticipants(nextTargets.slice(0, 2).map((target) => target.agentId));
      setSelected((id) => executions.some((row) => row.id === id) ? id : executions[0]?.id ?? '');
    }).catch(() => { if (generation.current === current) setError('Execution data could not be loaded. Check the local runtime and refresh.'); })
      .finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current++; };
  }, [workspaceId, attempt]);

  const hasRunning = rows.some((row) => row.status === 'running');
  useEffect(() => {
    if (!hasRunning) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const observe = async () => {
      try {
        const next = await executionApi.list(workspaceId);
        if (active) setRows((current) => next.map((row) => {
          const newer = current.find((item) => item.id === row.id);
          return newer && newer.revision > row.revision ? newer : row;
        }).concat(current.filter((row) => !next.some((item) => item.id === row.id))));
      } catch { if (active) setError('Execution observation failed. Status may be stale; refresh before further controls.'); }
      if (active) timer = setTimeout(() => void observe(), 500);
    };
    void observe();
    return () => { active = false; clearTimeout(timer); };
  }, [hasRunning, workspaceId]);

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const current = generation.current;
    try {
      const next = await executionApi.create(workspaceId, { goal, participantAgentIds: participants, collaborationMode: mode, taskId: taskId || null, pauseAfterStep });
      if (generation.current === current) { merge(next); setSelected(next.id); }
    } catch (reason) { if (generation.current === current) setError(reason instanceof Error ? reason.message : 'Execution creation failed.'); }
    finally { if (generation.current === current) setBusy(false); }
  }
  async function control(action: ExecutionAction) {
    if (!execution) return;
    setBusy(true); setError('');
    const current = generation.current;
    try {
      const next = await executionApi.control(workspaceId, execution.id, action);
      if (generation.current === current) merge(next);
    } catch (reason) { if (generation.current === current) setError(reason instanceof Error ? reason.message : 'Execution control failed.'); }
    finally { if (generation.current === current) setBusy(false); }
  }

  return <section className="execution-panel section-block" aria-labelledby="executions-heading">
    <h2 id="executions-heading">Prototype Executions</h2>
    <p>Execution is a durable runtime attempt, not Task planning state. No production providers are connected.</p>
    <button type="button" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Refresh Executions</button>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading Executions…</p> : <>
      <form onSubmit={create}><fieldset disabled={busy || targets.length === 0}>
        <legend>New Execution</legend>
        <label htmlFor="execution-task">Linked Task (optional)</label><select id="execution-task" value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">Standalone Workspace request</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select>
        <label htmlFor="execution-goal">Execution goal (snapshot, 500 characters maximum)</label><textarea id="execution-goal" required maxLength={500} value={goal} onChange={(event) => setGoal(event.target.value)} />
        <label htmlFor="execution-mode">Execution collaboration mode</label><select id="execution-mode" value={mode} onChange={(event) => setMode(event.target.value as CollaborationMode)}><option value="sequential">Sequential</option><option value="review">Review / Challenge</option></select>
        <p>Participants · selected order</p>{targets.map((target) => <label key={target.agentId}><input type="checkbox" checked={participants.includes(target.agentId)} onChange={(event) => setParticipants((ids) => event.target.checked ? [...ids, target.agentId] : ids.filter((id) => id !== target.agentId))} /> {target.displayName} · {target.backendMode.toUpperCase()} backend</label>)}
        <p>{participants.join(' → ') || 'No participants selected'}</p>
        <label><input type="checkbox" checked={pauseAfterStep} onChange={(event) => setPauseAfterStep(event.target.checked)} /> Pause after each completed step (safe-boundary demo)</label>
        <p>This stops before the next step, not inside the provider call. Resume continues from the saved checkpoint.</p>
        <button type="submit" disabled={!goal.trim() || participants.length === 0 || (mode === 'review' && participants.length !== 2)}>Create Execution</button>
      </fieldset></form>
      {targets.length === 0 && <p>No executable backend is configured. Existing Executions remain inspectable.</p>}
      <div className="execution-list" aria-label="Execution history">{rows.length === 0 ? <p>No Executions yet.</p> : rows.map((row) => <button type="button" key={row.id} aria-pressed={selected === row.id} onClick={() => setSelected(row.id)}>{row.plan.goal} · {row.status} · {row.id}</button>)}</div>
      {execution && <article aria-label="Execution detail">
        <h3>Execution · {execution.status}</h3><p>ID: {execution.id}</p><p>Linked Task: {execution.taskId ?? 'None — standalone request'}</p><p>Goal: {execution.plan.goal}</p>
        <p>Runtime: {execution.runtimeId} · Mode: {execution.plan.mode}</p><p>Participants: {execution.plan.steps.map((step) => step.agentId).join(' → ')}</p>
        <p>Completed steps: {execution.checkpoint.nextStepIndex} / {execution.plan.steps.length}</p><p>Recorded in-flight step: {execution.checkpoint.currentStepId ?? 'None'} · Next incomplete step: {execution.plan.steps[execution.checkpoint.nextStepIndex]?.id ?? 'None'}</p>
        {isTerminalExecution(execution.status) && <p>Terminal Execution; no further steps will run.</p>}
        <p>Created: {execution.createdAt} · Started: {execution.startedAt ?? 'Not started'} · Updated: {execution.updatedAt} · Finished: {execution.finishedAt ?? 'Not finished'}</p>
        {execution.pendingControl && <p role="status">{execution.pendingControl} requested — waiting for the current call to settle; the provider call is not suspended.</p>}
        <div className="execution-controls">
          {execution.status === 'created' && <button type="button" disabled={busy || !!error} onClick={() => void control('start')}>Start Execution</button>}
          {execution.status === 'running' && <button type="button" disabled={busy || !!error || execution.pendingControl !== null} onClick={() => void control('pause')}>Pause Execution</button>}
          {execution.status === 'paused' && <button type="button" disabled={busy || !!error} onClick={() => void control('resume')}>Resume Execution</button>}
          {!isTerminalExecution(execution.status) && <button type="button" disabled={busy || !!error || execution.pendingControl === 'cancel'} onClick={() => void control('cancel')}>Cancel Execution</button>}
        </div>
        {execution.failure && <p role="alert">{execution.failure.stepId} · {execution.failure.agentId}: {execution.failure.message} ({execution.failure.code})</p>}
        <ol>{execution.checkpoint.contributions.map((item) => <li key={item.stepId}><h4>{item.stepId} · {item.agentDisplayName}</h4><strong>{item.mode === 'mock' ? 'MOCK · TEST CONTRIBUTION' : 'REAL · CONTRIBUTION'}</strong><p className="collaboration-output">{item.output}</p><small>Agent {item.agentId} · Provider {item.providerId} · Model {item.modelId}</small></li>)}</ol>
        {execution.status === 'completed' ? <p>Final contribution: {execution.checkpoint.contributions.at(-1)?.agentDisplayName} · {execution.checkpoint.contributions.at(-1)?.stepId}</p> : <p>No completed final result. Preserved contributions remain available above.</p>}
      </article>}
    </>}
  </section>;
}
