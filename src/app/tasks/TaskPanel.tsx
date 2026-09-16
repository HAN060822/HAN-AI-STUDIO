import { type FormEvent, useEffect, useState } from 'react';
import { allowedTaskTransitions, type TaskStatus } from '../../core/tasks/task';
import { useTask } from './useTasks';

type TaskPanelProps = { workspaceId: string; taskId: string; onClose: () => void; onChanged?: () => void; compact?: boolean };
const statusLabel: Record<TaskStatus, string> = { draft: 'Draft', discussing: 'Discussing', paused: 'Paused', blocked: 'Blocked', completed: 'Completed', cancelled: 'Cancelled' };

export function TaskPanel({ workspaceId, taskId, onClose, onChanged, compact = false }: TaskPanelProps) {
  const controller = useTask(workspaceId, taskId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  useEffect(() => { if (controller.task) { setTitle(controller.task.title); setGoal(controller.task.goal); } }, [controller.task]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated = await controller.update({ title, goal });
    if (updated) { setEditing(false); onChanged?.(); }
  }

  async function transition(status: TaskStatus) {
    const updated = await controller.update({ status });
    if (updated) onChanged?.();
  }

  if (controller.loading) return <p className="loading-state" role="status">Opening Task…</p>;
  if (!controller.task) return <div className="task-panel task-unavailable"><p role="alert">{controller.error || 'This Task is unavailable.'}</p><button type="button" onClick={onClose}>Back to Tasks</button></div>;
  const task = controller.task;
  const nextStatuses = allowedTaskTransitions(task.status);

  return <section className={`task-panel${compact ? ' task-panel-compact' : ''}`} aria-labelledby={`task-title-${task.id}`}>
    <div className="task-panel-nav"><button type="button" onClick={onClose}>← Back to Tasks</button><span>Persistent work object · execution is not connected</span></div>
    {controller.error && <div className="workspace-error" role="alert">{controller.error}</div>}
    {editing ? <form className="task-edit-form" onSubmit={save}>
      <label htmlFor={`task-title-input-${task.id}`}>Task title</label><input id={`task-title-input-${task.id}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} required />
      <label htmlFor={`task-goal-input-${task.id}`}>Goal</label><textarea id={`task-goal-input-${task.id}`} value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={4000} required />
      <div><button type="submit" disabled={controller.saving}>Save Task</button><button type="button" className="quiet-button" onClick={() => { setTitle(task.title); setGoal(task.goal); setEditing(false); }}>Cancel</button></div>
    </form> : <>
      <div className="task-panel-heading"><div><p className="eyebrow">Task · {statusLabel[task.status]}</p><h2 id={`task-title-${task.id}`}>{task.title}</h2><p className="task-goal">{task.goal}</p></div><button type="button" onClick={() => setEditing(true)}>Edit</button></div>
      <dl className="task-details"><div><dt>Status</dt><dd>{statusLabel[task.status]}</dd></div><div><dt>Source Chat</dt><dd>{task.sourceChatId ?? 'None — Workspace Task'}</dd></div><div><dt>Task ID</dt><dd>{task.id}</dd></div><div><dt>Updated</dt><dd>{new Date(task.updatedAt).toLocaleString()}</dd></div>{task.completedAt && <div><dt>Completed</dt><dd>{new Date(task.completedAt).toLocaleString()}</dd></div>}</dl>
      <div className="task-transitions"><span>Change planning state</span>{nextStatuses.length ? nextStatuses.map((status) => <button type="button" key={status} disabled={controller.saving} onClick={() => void transition(status)}>{statusLabel[status]}</button>) : <strong>Terminal state</strong>}</div>
    </>}
  </section>;
}
