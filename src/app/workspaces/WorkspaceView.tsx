import { FormEvent, useEffect, useState } from 'react';
import type { Workspace } from '../../core/workspaces/workspace';
import type { WorkspaceController } from './useWorkspaces';

type WorkspaceViewProps = {
  workspace: Workspace;
  controller: WorkspaceController;
  onClose: () => void;
};

const futureRooms = ['Chats', 'Tasks', 'Projects', 'Knowledge', 'Assets', 'History'];

export function WorkspaceView({ workspace, controller, onClose }: WorkspaceViewProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');

  useEffect(() => { setName(workspace.name); setDescription(workspace.description ?? ''); }, [workspace]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    const updated = await controller.update(workspace.id, { name, description });
    if (updated) setEditing(false);
  }

  return <div className="workspace-view">
    <div className="workspace-view-nav"><button type="button" onClick={onClose}>← Close workspace</button><span>Persistent local workspace</span></div>
    {controller.error && <div className="workspace-error" role="alert">{controller.error}</div>}
    <header className="workspace-hero">
      <span className="workspace-hero-mark" aria-hidden="true">✦</span>
      {editing ? <form onSubmit={save} className="workspace-edit-form">
        <label htmlFor="edit-workspace-name">Workspace name</label><input id="edit-workspace-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
        <label htmlFor="edit-workspace-description">Description</label><textarea id="edit-workspace-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} />
        <div><button type="submit" disabled={controller.saving}>{controller.saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="quiet-button" onClick={() => setEditing(false)}>Cancel</button></div>
      </form> : <div className="workspace-hero-copy"><p className="eyebrow">Workspace</p><h1>{workspace.name}</h1><p>{workspace.description || 'A persistent place, ready for its purpose.'}</p><div className="workspace-meta"><span>Status · {workspace.status}</span><span>Created · {new Date(workspace.createdAt).toLocaleString()}</span><span>Updated · {new Date(workspace.updatedAt).toLocaleString()}</span><span>ID · {workspace.id}</span></div></div>}
      {!editing && <div className="workspace-hero-actions"><button type="button" onClick={() => setEditing(true)}>Edit</button><button type="button" className="archive-button" onClick={async () => { const archived = await controller.archive(workspace.id); if (archived) onClose(); }}>Archive</button></div>}
    </header>
    <section aria-labelledby="workspace-rooms-heading" className="workspace-rooms"><div className="section-heading"><div><p className="eyebrow">Inside this place</p><h2 id="workspace-rooms-heading">Workspace rooms</h2></div><span className="section-note">Arriving in later stages</span></div><div>{futureRooms.map((room) => <article key={room}><span aria-hidden="true">○</span><h3>{room}</h3><p>Not connected yet</p></article>)}</div></section>
  </div>;
}
