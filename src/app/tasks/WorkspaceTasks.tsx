import { type FormEvent, useState } from 'react';
import { isClosedTaskStatus } from '../../core/tasks/task';
import { TaskPanel } from './TaskPanel';
import { useTasks } from './useTasks';

export function WorkspaceTasks({ workspaceId }: { workspaceId: string }) {
  const tasks = useTasks(workspaceId);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [view, setView] = useState<'active' | 'closed'>('active');
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const task = await tasks.create(title, goal);
    if (task) { setTitle(''); setGoal(''); setCreating(false); setOpenTaskId(task.id); }
  }
  const activeTasks = tasks.tasks.filter((task) => !isClosedTaskStatus(task.status));
  const closedTasks = tasks.tasks.filter((task) => isClosedTaskStatus(task.status));
  const visibleTasks = view === 'active' ? activeTasks : closedTasks;
  if (openTaskId) return <TaskPanel workspaceId={workspaceId} taskId={openTaskId} onClose={() => { setOpenTaskId(null); void tasks.reload(); }} onChanged={(task) => { void tasks.reload(); if (isClosedTaskStatus(task.status)) { setView('active'); setOpenTaskId(null); } }} />;
  return <section className="workspace-tasks" aria-labelledby="workspace-tasks-heading">
    <div className="section-heading"><div><p className="eyebrow">Persistent work objects</p><h2 id="workspace-tasks-heading">Tasks · {activeTasks.length} active</h2></div><button type="button" className="text-button" onClick={() => setCreating(true)}>+ New Task</button></div>
    <div className="task-view-switch" aria-label="Task collection view"><button type="button" aria-pressed={view === 'active'} onClick={() => setView('active')}>Active <span>{activeTasks.length}</span></button><button type="button" aria-pressed={view === 'closed'} onClick={() => setView('closed')}>Closed <span>{closedTasks.length}</span></button></div>
    {tasks.error && <div className="workspace-error" role="alert"><span>{tasks.error}</span><button type="button" onClick={() => void tasks.reload()}>Try again</button></div>}
    {creating && <form className="task-create-form" onSubmit={create}><label htmlFor="new-task-title">Task title</label><input id="new-task-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} required /><label htmlFor="new-task-goal">Goal</label><textarea id="new-task-goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={4000} required /><div><button type="submit" disabled={tasks.saving}>Create Task</button><button type="button" className="quiet-button" onClick={() => setCreating(false)}>Cancel</button></div></form>}
    {tasks.loading ? <p className="loading-state" role="status">Loading Tasks…</p> : visibleTasks.length === 0 ? <div className="empty-state task-empty"><span className="empty-mark" aria-hidden="true">✓</span><div><h3>{view === 'active' ? 'No active Tasks.' : 'No closed Tasks.'}</h3><p>{view === 'active' ? 'Create a durable work object when discussion becomes something to do.' : 'Completed and cancelled Tasks remain available here.'}</p></div></div> : <div className="task-list" aria-label={`${view === 'active' ? 'Active' : 'Closed'} Tasks`}>{visibleTasks.map((task) => <article key={task.id}><span className={`task-status task-status-${task.status}`}>{task.status}</span><h3>{task.title}</h3>{task.sourceChatId && <small title={task.sourceChatId}>Linked Chat</small>}<time dateTime={task.updatedAt}>{new Date(task.updatedAt).toLocaleDateString()}</time><button type="button" onClick={() => setOpenTaskId(task.id)}>Open</button></article>)}</div>}
  </section>;
}
