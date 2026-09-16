import { type FormEvent, useEffect, useState } from 'react';
import type { AgentInvocationTarget } from '../../application/agents/agentInvocationService.ts';
import type { AgentId } from '../../core/agents/agent.ts';
import { MAX_COLLABORATION_GOAL, type CollaborationMode, type CollaborationResult } from '../../core/collaboration/collaboration.ts';
import { listInvocationTargets } from '../agents/agentInvocationApi';
import { runCollaboration } from './collaborationApi';

export function CollaborationPanel() {
  const [targets, setTargets] = useState<readonly AgentInvocationTarget[]>([]);
  const [participants, setParticipants] = useState<AgentId[]>([]);
  const [goal, setGoal] = useState('');
  const [mode, setMode] = useState<CollaborationMode>('sequential');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CollaborationResult | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    void listInvocationTargets().then((next) => {
      if (active) { setTargets(next); setParticipants(next.slice(0, 2).map((target) => target.agentId)); }
    }).catch(() => {
      if (active) setLoadError('Collaboration test Agents could not be loaded. Restart the development server or retry.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadAttempt]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setError(''); setResult(null);
    try { setResult(await runCollaboration({ goal, participantAgentIds: participants, collaborationMode: mode })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Collaboration failed.'); }
    finally { setSending(false); }
  }

  return <section className="section-block collaboration-panel" aria-labelledby="collaboration-heading">
    <p className="eyebrow">Prototype test path</p><h2 id="collaboration-heading">Prototype Collaboration</h2>
    <p>Explicit Agent contributions, not Task execution. Results are temporary; production providers remain disconnected.</p>
    {loading ? <p role="status">Checking collaboration test Agents…</p> : loadError ? <div role="alert"><p>{loadError}</p><button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>Retry collaboration targets</button></div> : targets.length === 0 ? <p role="status">No executable test Agents are configured. Provider mode may be set to none.</p> : <form onSubmit={submit}>
      <fieldset disabled={sending}>
        <legend>Collaboration request</legend>
        <label htmlFor="collaboration-goal">Collaboration goal</label>
        <textarea id="collaboration-goal" required maxLength={MAX_COLLABORATION_GOAL} value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} />
        <label htmlFor="collaboration-mode">Collaboration mode</label>
        <select id="collaboration-mode" value={mode} onChange={(event) => setMode(event.target.value as CollaborationMode)}><option value="sequential">Sequential</option><option value="review">Review / Challenge</option></select>
        <p>Participants · selection order determines contribution order. Review needs exactly two.</p>
        <div className="collaboration-participants">{targets.map((target) => <label key={target.agentId}><input type="checkbox" checked={participants.includes(target.agentId)} onChange={(event) => setParticipants((current) => event.target.checked ? [...current, target.agentId] : current.filter((id) => id !== target.agentId))} />{target.displayName} · {target.backendMode === 'mock' ? 'Mock test participant' : 'Real backend participant'}</label>)}</div>
        <p aria-label="Selected collaboration order">{participants.map((id) => targets.find((target) => target.agentId === id)?.displayName).join(' → ') || 'No participants selected'}</p>
        <button type="submit" disabled={!goal.trim() || participants.length === 0 || (mode === 'review' && participants.length !== 2)}>Run Collaboration</button>
      </fieldset>
    </form>}
    {sending && <p role="status">Awaiting collaboration contributions…</p>}
    {error && <p role="alert">{error}</p>}
    {result && <div aria-label="Collaboration result" className="collaboration-result">
      <p role="status">Collaboration {result.status} · {result.mode}</p><p>Goal: {result.goal}</p>
      <ol>{result.contributions.map((contribution) => <li key={contribution.stepId}><article aria-label={`${contribution.stepId} ${contribution.agentDisplayName} contribution`}>
        <h3>{contribution.stepId} · {contribution.agentDisplayName}</h3>
        <strong>{contribution.mode === 'mock' ? 'MOCK · TEST CONTRIBUTION' : 'REAL · CONTRIBUTION'}</strong>
        <p className="collaboration-output">{contribution.output}</p>
        <small>Agent {contribution.agentId} · Provider {contribution.providerId} · Model {contribution.modelId} · {contribution.status}</small>
        {contribution.handoff && <details><summary>Handoff summary · {contribution.handoff.sourceAgentId} → {contribution.handoff.targetAgentId}</summary>
          <p>Original goal: {contribution.handoff.originalGoal}</p><p>{contribution.handoff.requestedNextAction}</p>
          <p className="collaboration-output">{contribution.handoff.relevantContribution}</p>
          <p>{contribution.handoff.contributionTruncated ? 'Prior contribution excerpt truncated to 800 characters.' : 'Prior contribution fits within the context limit.'}</p>
        </details>}
      </article></li>)}</ol>
      {result.failure && <p role="alert">{result.failure.stepId} · {result.failure.agentId}: {result.failure.message} ({result.failure.code}). No final result; no Agent was substituted.</p>}
      {result.finalContribution && <article aria-label="Final collaboration contribution"><h3>Final · {result.finalContribution.agentDisplayName} · {result.finalContribution.stepId}</h3><strong>{result.finalContribution.mode === 'mock' ? 'MOCK · TEST OUTPUT' : 'REAL · OUTPUT'}</strong><p className="collaboration-output">{result.finalContribution.output}</p><small>Agent {result.finalContribution.agentId} · Provider {result.finalContribution.providerId} · Model {result.finalContribution.modelId}</small></article>}
    </div>}
  </section>;
}
