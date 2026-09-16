import { type FormEvent, useEffect, useState } from 'react';
import type { AgentInvocationResult, AgentInvocationTarget } from '../../application/agents/agentInvocationService.ts';
import { invokeAgent, listInvocationTargets } from './agentInvocationApi';

export function AgentInvocationPanel() {
  const [targets, setTargets] = useState<readonly AgentInvocationTarget[]>([]);
  const [selected, setSelected] = useState('');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AgentInvocationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  function loadTargets() {
    setLoading(true); setError('');
    void listInvocationTargets().then((next) => { setTargets(next); setSelected(next[0]?.agentId ?? ''); }).catch(() => { setTargets([]); setError('Mock test backend could not be loaded. Restart the development server, then try again.'); }).finally(() => setLoading(false));
  }
  useEffect(loadTargets, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setError(''); setResult(null);
    try { setResult(await invokeAgent(selected, input)); setInput(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Agent invocation failed.'); }
    finally { setSending(false); }
  }
  return <div className="agent-invocation" aria-labelledby="agent-invocation-heading">
    <div><p className="eyebrow">Prototype test path</p><h3 id="agent-invocation-heading">Agent Invocation</h3><p>This isolated surface proves the provider boundary. It does not run Tasks or collaboration.</p></div>
    {loading ? <p role="status">Checking test backend…</p> : error && targets.length === 0 ? <div className="workspace-error" role="alert"><span>{error}</span><button type="button" onClick={loadTargets}>Try again</button></div> : targets.length === 0 ? <p>No executable test backend is configured.</p> : <form onSubmit={submit}>
      <label htmlFor="invocation-agent">Agent</label><select id="invocation-agent" value={selected} onChange={(event) => setSelected(event.target.value)}>{targets.map((target) => <option key={target.agentId} value={target.agentId}>{target.displayName} · Mock Test Backend</option>)}</select>
      <label htmlFor="invocation-input">Message</label><input id="invocation-input" value={input} maxLength={2000} required onChange={(event) => setInput(event.target.value)} placeholder="Send a short test input" />
      <button type="submit" disabled={sending}>{sending ? 'Invoking…' : 'Invoke test Agent'}</button>
    </form>}
    {error && targets.length > 0 && <p role="alert">{error}</p>}
    {result && <article className="agent-result" aria-label="Mock provider result"><strong>MOCK · TEST OUTPUT</strong><p>{result.output}</p><small>Agent {result.agentId} · Provider {result.providerId} · Model {result.modelId} · {result.status}</small></article>}
  </div>;
}
