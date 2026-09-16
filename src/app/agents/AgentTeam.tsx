import { initialAgentRegistry } from '../../application/agents/initialAgentRegistry';
import type { AgentId, AgentStatus } from '../../core/agents/agent';
import { AgentInvocationPanel } from './AgentInvocationPanel';

const presentation: Record<AgentId, { mark: string; accent: 'lavender' | 'peach' | 'blue' }> = {
  'agent-gpt': { mark: '✦', accent: 'lavender' },
  'agent-gemini': { mark: '◐', accent: 'peach' },
  'agent-codex': { mark: '⌘', accent: 'blue' },
};

const statusLabel: Record<AgentStatus, string> = {
  standby: 'Standby',
  unavailable: 'Unavailable',
};

export function AgentTeam() {
  const agents = initialAgentRegistry.list();
  return <section className="section-block team-section" aria-labelledby="team-heading">
    <div className="section-heading"><div><p className="eyebrow">Your collaborators</p><h2 id="team-heading">AI Team</h2></div><span className="section-note">Registry-backed · providers not connected</span></div>
    <div className="agent-grid">
      {agents.map((agent) => {
        const visual = presentation[agent.id];
        return <article className={`agent-card ${visual.accent}`} key={agent.id} data-agent-id={agent.id}>
          <div className="agent-card-top"><span className="agent-avatar" aria-hidden="true">{visual.mark}</span><span className={`status status-${agent.status}`}><span aria-hidden="true" />{statusLabel[agent.status]}</span></div>
          <h3>{agent.displayName}</h3><p>{agent.roleSummary}</p>
        </article>;
      })}
    </div>
    <AgentInvocationPanel />
  </section>;
}
