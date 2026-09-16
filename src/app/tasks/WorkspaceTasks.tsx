import { type FormEvent, useState } from 'react';
import { TaskPanel } from './TaskPanel';
import { useTasks } from './useTasks';

export function WorkspaceTasks({ workspaceId }: { workspaceId: string }) {
  const tasks = useTasks(workspaceId);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const task = await tasks.create(title, goal);
    if (task) { setTitle(''); setGoal(''); setCreating(false); setOpenTaskId(task.id); }
  }
  if (openTaskId) return <TaskPanel workspaceId={workspaceId} taskId={openTaskId} onClose={() => { setOpenTaskId(null); void tasks.reload(); }} onChanged={() => void tasks.reload()} />;
  return <section className="workspace-tasks" aria-labelledby="workspace-tasks-heading">
    <div className="section-heading"><div><p className="eyebrow">Persistent work objects</p><h2 id="workspace-tasks-heading">Tasks</h2></div><button type="button" className="text-button" onClick={() => setCreating(true)}>+ New Task</button></div>
    {tasks.error && <div className="workspace-error" role="alert"><span>{tasks.error}</span><button type="button" onClick={() => void tasks.reload()}>Try again</button></div>}
    {creating && <form className="task-create-form" onSubmit={create}><label htmlFor="new-task-title">Task title</label><input id="new-task-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} required /><label htmlFor="new-task-goal">Goal</label><textarea id="new-task-goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={4000} required /><div><button type="submit" disabled={tasks.saving}>Create Task</button><button type="button" className="quiet-button" onClick={() => setCreating(false)}>Cancel</button></div></form>}
    {tasks.loading ? <p className="loading-state" role="status">Loading Tasks…</p> : tasks.tasks.length === 0 ? <div className="empty-state task-empty"><span className="empty-mark" aria-hidden="true">✓</span><div><h3>No Tasks yet.</h3><p>Create a durable work object when discussion becomes something to do.</p></div></div> : <div className="task-list">{tasks.tasks.map((task) => <article key={task.id}><div><span>{task.status}</span><h3>{task.title}</h3><p>{task.goal}</p>{task.sourceChatId && <small>From Chat · {task.sourceChatId}</small>}</div><button type="button" onClick={() => setOpenTaskId(task.id)}>Open Task</button></article>)}</div>}
  </section>;
}
