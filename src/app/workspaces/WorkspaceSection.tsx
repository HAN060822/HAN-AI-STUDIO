import { FormEvent, useState } from 'react';
import type { Workspace } from '../../core/workspaces/workspace';
import type { WorkspaceController } from './useWorkspaces';

type WorkspaceSectionProps = {
  controller: WorkspaceController;
  onOpen: (workspace: Workspace) => void;
};

export function WorkspaceSection({ controller, onOpen }: WorkspaceSectionProps) {
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');
  const active = controller.workspaces.filter((workspace) => workspace.status === 'active');
  const archived = controller.workspaces.filter((workspace) => workspace.status === 'archived');

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setValidationError('Workspace name is required.');
      return;
    }
    const workspace = await controller.create({ name, description });
    if (!workspace) return;
    setName('');
    setDescription('');
    setValidationError('');
    setComposerOpen(false);
  }

  return (
    <section className="section-block workspace-section" aria-labelledby="workspaces-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Places to make things</p><h2 id="workspaces-heading">Workspaces</h2></div>
        <button className="text-button" type="button" onClick={() => { controller.clearError(); setComposerOpen(true); }}>+ Create workspace</button>
      </div>

      {(controller.error || validationError) && <div className="workspace-error" role="alert"><span>{validationError || controller.error}</span>{controller.error && <button type="button" onClick={() => void controller.reload()}>Try again</button>}</div>}

      {isComposerOpen && <form className="workspace-composer" onSubmit={createWorkspace}>
        <label htmlFor="workspace-name">Workspace name</label>
        <input id="workspace-name" autoFocus value={name} onChange={(event) => { setName(event.target.value); setValidationError(''); }} placeholder="e.g. Garden project" maxLength={120} />
        <label htmlFor="workspace-description">Description <span>Optional</span></label>
        <textarea id="workspace-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What belongs in this place?" maxLength={1000} />
        <div className="composer-actions"><button type="submit" disabled={controller.saving}>{controller.saving ? 'Saving…' : 'Create'}</button><button type="button" className="quiet-button" onClick={() => { setComposerOpen(false); setValidationError(''); }}>Cancel</button></div>
      </form>}

      {controller.loading ? <p className="loading-state" role="status">Loading your workspaces…</p> : active.length === 0 ? <div className="empty-state"><span className="empty-mark" aria-hidden="true">⌂</span><div><h3>Your first room is waiting.</h3><p>Create a workspace to give future projects, conversations, and your team a shared home.</p></div></div> : <div className="workspace-list" aria-live="polite">
        {active.map((workspace) => <article className="workspace-card" key={workspace.id}>
          <span className="workspace-mark" aria-hidden="true">✦</span>
          <div><h3>{workspace.name}</h3><p>{workspace.description || 'A persistent place, ready for its purpose.'}</p><small>Updated {new Date(workspace.updatedAt).toLocaleString()}</small></div>
          <div className="workspace-card-actions"><button type="button" onClick={() => onOpen(workspace)}>Open</button><button className="archive-button" type="button" disabled={controller.saving} onClick={() => void controller.archive(workspace.id)}>Archive</button></div>
        </article>)}
      </div>}

      {archived.length > 0 && <details className="archived-workspaces"><summary>Archived workspaces <span>{archived.length}</span></summary><div>
        {archived.map((workspace) => <article key={workspace.id}><span><strong>{workspace.name}</strong><small>Archived {workspace.archivedAt ? new Date(workspace.archivedAt).toLocaleString() : ''}</small></span><button type="button" disabled={controller.saving} onClick={async () => { const restored = await controller.restore(workspace.id); if (restored) onOpen(restored); }}>Restore &amp; open</button></article>)}
      </div></details>}
    </section>
  );
}
