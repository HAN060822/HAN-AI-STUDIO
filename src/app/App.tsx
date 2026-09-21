import { useState } from 'react';
import { AgentTeam } from './agents/AgentTeam';
import { CollaborationPanel } from './collaboration/CollaborationPanel';
import { WorkspaceSection } from './workspaces/WorkspaceSection';
import { WorkspaceView } from './workspaces/WorkspaceView';
import { useWorkspaces } from './workspaces/useWorkspaces';

function SparkMark() {
  return <span className="spark-mark" aria-hidden="true">✦</span>;
}

export function App() {
  const [openWorkspaceId, setOpenWorkspaceId] = useState<string | null>(null);
  const workspaceController = useWorkspaces();
  const openWorkspace = workspaceController.workspaces.find((workspace) => workspace.id === openWorkspaceId) ?? null;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar" aria-label="Application navigation">
      <a className="brand" href="#main-content" aria-label="HAN's AI STUDIO home" onClick={() => setOpenWorkspaceId(null)}><SparkMark /><span>HAN's<br />AI STUDIO</span></a>
      <nav className="primary-nav" aria-label="Primary navigation">
        <button className={`nav-item ${!openWorkspace ? 'is-current' : ''}`} type="button" aria-current={!openWorkspace ? 'page' : undefined} onClick={() => setOpenWorkspaceId(null)}><span className="nav-symbol" aria-hidden="true">⌂</span>Home</button>
      </nav>
      <div className="sidebar-lower"><p>Prototype 0</p><p>Local work · Mock backends only</p></div>
    </aside>
    <main id="main-content" tabIndex={-1} className="main-content">
      <header className="topbar"><div className="crumb">{openWorkspace?.name ?? 'AI World Lobby'}</div><p className="topbar-note">Prototype 0 · Real providers are not connected</p></header>
      <div className="lobby">
        {openWorkspace ? <WorkspaceView key={openWorkspace.id} workspace={openWorkspace} controller={workspaceController} onClose={() => setOpenWorkspaceId(null)} /> : <>
          <section className="welcome" aria-labelledby="welcome-heading">
            <p className="eyebrow">Good to see you, HAN</p>
            <h1 id="welcome-heading">Your AI world,<br /><em>ready when you are.</em></h1>
            <p className="intro">Open a workspace to continue saved Tasks, Chats and Executions, or create one to begin.</p>
            <p className="prototype-notice">Prototype 0 uses deterministic Mock output, not real AI. Your committed work stays in local storage.</p>
          </section>
          <WorkspaceSection controller={workspaceController} onOpen={(workspace) => setOpenWorkspaceId(workspace.id)} />
          <details className="advanced-tools section-block"><summary>Advanced: Agent registry &amp; test tools</summary>
            <p>Inspect backend availability or try a temporary invocation/collaboration. These test results are not saved. Use a Workspace Execution for durable work.</p>
            <AgentTeam />
            <CollaborationPanel />
          </details>
        </>}
      </div>
    </main>
  </div>;
}
