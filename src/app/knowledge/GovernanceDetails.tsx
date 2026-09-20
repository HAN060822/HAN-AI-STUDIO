import { useEffect, useState } from 'react';
import type { AuditEvent } from '../../core/governance/governance';
import type { SecretStatus } from '../../core/secrets/secret';
import { knowledgeApi } from './knowledgeApi';

export function GovernanceDetails({ workspaceId, knowledgeId, refresh }: { workspaceId: string; knowledgeId: string; refresh: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [secrets, setSecrets] = useState<SecretStatus[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setEvents([]); setSecrets([]);
    void Promise.all([knowledgeApi.audit(workspaceId, knowledgeId), knowledgeApi.secretStatus()])
      .then(([rows, status]) => { if (active) { setEvents(rows); setSecrets(status); } })
      .catch(() => { if (active) setError('Governance details could not be loaded. Refresh Knowledge to retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, knowledgeId, refresh]);
  return <details className="governance-details"><summary>Advanced: authority, audit &amp; Secret references</summary>
    <p>Trusted local owner: HAN. This is not multi-user authentication. Agents/runtime have no publication grant. Connection is not permission.</p>
    {loading ? <p role="status">Loading governance details…</p> : error ? <p role="alert">{error}</p> : <>
      <h4>Recent Audit events · this Knowledge</h4>
      {events.length === 0 ? <p>No Stage 11 attempts recorded. Historical actions are not backfilled.</p> : <ol aria-label="Knowledge audit events">{events.map((event) => <li key={event.id}>
        <p>{event.timestamp} · {event.actor ? `${event.actor.type}/${event.actor.id}` : 'Unattributed request'} · {event.intent.action} · {event.intent.resource.type}/{event.intent.resource.id}</p>
        <p>{event.decision.status} · {event.outcome === 'started' ? 'started (look for a matching final event; otherwise result is unconfirmed)' : event.outcome} · {event.code}</p>
        <small>Audit {event.id} · Attempt {event.attemptId} · Approval {event.approvalId ?? 'None'}</small>
      </li>)}</ol>}
      <h4>Server-only Secret references</h4><p>No secret-use grants or real provider integrations are enabled. Configured does not mean authorized.</p>
      <ul>{secrets.map((item) => <li key={item.ref}>{item.ref} · {item.status}</li>)}</ul>
    </>}
  </details>;
}
