import { FormEvent, useState } from 'react';

type AgentStatus = 'Standby' | 'Working' | 'Waiting';

type Agent = {
  name: 'GPT' | 'Gemini' | 'Codex';
  mark: string;
  status: AgentStatus;
  description: string;
  accent: 'lavender' | 'peach' | 'blue';
};

const agents: Agent[] = [
  { name: 'GPT', mark: '✦', status: 'Standby', description: 'Helps explore, frame, and shape ideas.', accent: 'lavender' },
  { name: 'Gemini', mark: '◐', status: 'Working', description: 'Brings a second lens to research and synthesis.', accent: 'peach' },
  { name: 'Codex', mark: '⌘', status: 'Waiting', description: 'Helps turn clear intent into working systems.', accent: 'blue' },
];

const primaryNavigation = ['Home', 'Workspaces', 'Projects', 'Library', 'Activity'];

function SparkMark() {
  return <span className="spark-mark" aria-hidden="true">✦</span>;
}

export function App() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [isWorkspaceComposerOpen, setWorkspaceComposerOpen] = useState(false);
  const [intentNotice, setIntentNotice] = useState('');

  function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspaces((current) => [...current, workspaceName.trim() || 'Untitled workspace']);
    setWorkspaceName('');
    setWorkspaceComposerOpen(false);
  }

  function showIntentNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIntentNotice('Intent execution is not connected yet. This Stage 1 entry is a local interface preview.');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Application navigation">
        <a className="brand" href="#home" aria-label="HAN's AI STUDIO home"><SparkMark /><span>HAN's<br />AI STUDIO</span></a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Explore</p>
          {primaryNavigation.map((item) => (
            <button className={`nav-item ${item === 'Home' ? 'is-current' : ''}`} type="button" key={item} aria-current={item === 'Home' ? 'page' : undefined} disabled={item !== 'Home'} title={item === 'Home' ? undefined : `${item} is coming in a later stage`}>
              <span className="nav-symbol" aria-hidden="true">{item === 'Home' ? '⌂' : '○'}</span>{item}{item !== 'Home' && <span className="coming-soon">Soon</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-lower">
          <p className="nav-label">Studio</p>
          <button className="nav-item" type="button" disabled title="Connections is coming in a later stage"><span className="nav-symbol" aria-hidden="true">⌘</span>Connections<span className="coming-soon">Soon</span></button>
          <button className="nav-item" type="button" disabled title="Settings is coming in a later stage"><span className="nav-symbol" aria-hidden="true">⚙</span>Settings<span className="coming-soon">Soon</span></button>
          <div className="profile-card" aria-label="HAN profile placeholder"><span className="profile-avatar">H</span><span><strong>HAN</strong><small>Profile</small></span></div>
        </div>
      </aside>

      <main id="home" className="main-content">
        <header className="topbar"><div className="crumb"><span className="live-dot" aria-hidden="true" /> AI World Lobby</div><p className="topbar-note">A quiet place to think with your AI team.</p></header>
        <div className="lobby">
          <section className="welcome" aria-labelledby="welcome-heading">
            <p className="eyebrow">Good to see you, HAN</p>
            <h1 id="welcome-heading">Your AI world,<br /><em>ready when you are.</em></h1>
            <p className="intro">Gather your work, invite your collaborators, and begin from one calm place.</p>
          </section>

          <section className="intent-panel" aria-labelledby="intent-heading">
            <div className="intent-panel-copy"><SparkMark /><div><h2 id="intent-heading">What would you like to begin?</h2><p>Ask, search, create, or find your way around.</p></div></div>
            <form className="intent-form" onSubmit={showIntentNotice}>
              <label className="sr-only" htmlFor="global-intent">Global intent</label>
              <input id="global-intent" name="global-intent" placeholder="Try: Start a research space for…" />
              <button className="intent-submit" type="submit" aria-label="Preview intent entry" aria-describedby="intent-preview-note">↑</button>
            </form>
            {intentNotice && <p className="intent-notice" role="status">{intentNotice}</p>}
            <p className="intent-disclosure" id="intent-preview-note">Intent Engine preview · It will connect to your tools and team in a later stage.</p>
          </section>

          <section className="section-block team-section" aria-labelledby="team-heading">
            <div className="section-heading"><div><p className="eyebrow">Your collaborators</p><h2 id="team-heading">AI Team</h2></div><span className="section-note">Presence is locally simulated</span></div>
            <div className="agent-grid">
              {agents.map((agent) => <article className={`agent-card ${agent.accent}`} key={agent.name}>
                <div className="agent-card-top"><span className="agent-avatar" aria-hidden="true">{agent.mark}</span><span className={`status status-${agent.status.toLowerCase()}`}><span aria-hidden="true" />{agent.status}</span></div>
                <h3>{agent.name}</h3><p>{agent.description}</p>
              </article>)}
            </div>
          </section>

          <div className="content-grid">
            <section className="section-block workspace-section" aria-labelledby="workspaces-heading">
              <div className="section-heading"><div><p className="eyebrow">Places to make things</p><h2 id="workspaces-heading">Workspaces</h2></div><button className="text-button" type="button" onClick={() => setWorkspaceComposerOpen(true)}>+ Create workspace</button></div>
              {isWorkspaceComposerOpen && <form className="workspace-composer" onSubmit={createWorkspace}>
                <label htmlFor="workspace-name">Workspace name</label><div><input id="workspace-name" autoFocus value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="e.g. Garden project" /><button type="submit">Create</button><button type="button" className="quiet-button" onClick={() => setWorkspaceComposerOpen(false)}>Cancel</button></div>
              </form>}
              {workspaces.length === 0 ? <div className="empty-state"><span className="empty-mark" aria-hidden="true">⌂</span><div><h3>Your first room is waiting.</h3><p>Create a workspace to give a future project, conversation, and team a shared home.</p></div></div> : <div className="workspace-list" aria-live="polite">
                {workspaces.map((workspace, index) => <div className="workspace-card" key={`${workspace}-${index}`}><span aria-hidden="true">✦</span><strong>{workspace}</strong><small>Temporary Stage 1 workspace · resets when this page reloads</small></div>)}
              </div>}
            </section>

            <section className="section-block attention-section" aria-labelledby="attention-heading">
              <div className="section-heading"><div><p className="eyebrow">Keep an eye here</p><h2 id="attention-heading">Attention</h2></div></div>
              <div className="attention-empty"><span aria-hidden="true">☼</span><h3>Nothing needs your attention.</h3><p>Approvals, waiting agents, and unfinished work will gather here when the runtime arrives.</p></div>
            </section>
          </div>

          <section className="section-block continue-section" aria-labelledby="continue-heading">
            <div className="section-heading"><div><p className="eyebrow">Pick up where you left off</p><h2 id="continue-heading">Continue &amp; Active Work</h2></div><span className="section-note">No activity yet</span></div>
            <div className="empty-state compact-empty"><span className="empty-mark" aria-hidden="true">→</span><div><h3>Your work will find you here.</h3><p>Tasks, chats, projects, and active agent work will appear once those systems are connected.</p></div></div>
          </section>
        </div>
      </main>
    </div>
  );
}
