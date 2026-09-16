import { type FormEvent, useState } from 'react';
import { AgentTeam } from './agents/AgentTeam';
import { CollaborationPanel } from './collaboration/CollaborationPanel';
import { WorkspaceSection } from './workspaces/WorkspaceSection';
import { WorkspaceView } from './workspaces/WorkspaceView';
import { useWorkspaces } from './workspaces/useWorkspaces';

const primaryNavigation = ['Home', 'Workspaces', 'Projects', 'Library', 'Activity'];

function SparkMark() {
  return <span className="spark-mark" aria-hidden="true">✦</span>;
}

export function App() {
  const [intentNotice, setIntentNotice] = useState('');
  const [openWorkspaceId, setOpenWorkspaceId] = useState<string | null>(null);
  const workspaceController = useWorkspaces();
  const openWorkspace = workspaceController.workspaces.find((workspace) => workspace.id === openWorkspaceId) ?? null;

  function showIntentNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIntentNotice('Intent execution is not connected yet. This Stage 1 entry is a local interface preview.');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Application navigation">
        <a className="brand" href="#home" aria-label="HAN's AI STUDIO home" onClick={() => setOpenWorkspaceId(null)}><SparkMark /><span>HAN's<br />AI STUDIO</span></a>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Explore</p>
          {primaryNavigation.map((item) => (
            <button className={`nav-item ${item === 'Home' && !openWorkspace ? 'is-current' : ''}`} type="button" key={item} aria-current={item === 'Home' && !openWorkspace ? 'page' : undefined} disabled={item !== 'Home'} onClick={() => item === 'Home' && setOpenWorkspaceId(null)} title={item === 'Home' ? undefined : `${item} is coming in a later stage`}>
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

      {openWorkspace ? <main className="main-content">
        <header className="topbar"><div className="crumb"><span className="live-dot" aria-hidden="true" /> {openWorkspace.name}</div><p className="topbar-note">A persistent place in your AI world.</p></header>
        <div className="lobby"><WorkspaceView workspace={openWorkspace} controller={workspaceController} onClose={() => setOpenWorkspaceId(null)} /></div>
      </main> : <main id="home" className="main-content">
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

          <AgentTeam />
          <CollaborationPanel />

          <div className="content-grid">
            <WorkspaceSection controller={workspaceController} onOpen={(workspace) => setOpenWorkspaceId(workspace.id)} />

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
      </main>}
    </div>
  );
}
