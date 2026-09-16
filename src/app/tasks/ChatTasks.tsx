import { type FormEvent, useState } from 'react';
import { isClosedTaskStatus } from '../../core/tasks/task';
import { TaskPanel } from './TaskPanel';
import { useTasks } from './useTasks';

export function ChatTasks({ workspaceId, chatId }: { workspaceId: string; chatId: string }) {
  const tasks = useTasks(workspaceId, chatId);
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
  if (openTaskId) return <TaskPanel compact workspaceId={workspaceId} taskId={openTaskId} onClose={() => { setOpenTaskId(null); void tasks.reload(); }} onChanged={(task) => { void tasks.reload(); if (isClosedTaskStatus(task.status)) { setView('active'); setOpenTaskId(null); } }} />;
  return <section className="chat-tasks" aria-labelledby="chat-tasks-heading"><div className="section-heading"><div><p className="eyebrow">Discussion → work</p><h2 id="chat-tasks-heading">Related Tasks</h2></div><button type="button" className="text-button" onClick={() => setCreating(true)}>+ Task from Chat</button></div>
    <div className="task-view-switch task-view-switch-compact" aria-label="Related Task collection view"><button type="button" aria-pressed={view === 'active'} onClick={() => setView('active')}>Active <span>{activeTasks.length}</span></button><button type="button" aria-pressed={view === 'closed'} onClick={() => setView('closed')}>Closed <span>{closedTasks.length}</span></button></div>
    {tasks.error && <div className="workspace-error" role="alert">{tasks.error}</div>}
    {creating && <form className="task-create-form" onSubmit={create}><label htmlFor={`chat-task-title-${chatId}`}>Task title</label><input id={`chat-task-title-${chatId}`} value={title} onChange={(event) => setTitle(event.target.value)} required /><label htmlFor={`chat-task-goal-${chatId}`}>Goal</label><textarea id={`chat-task-goal-${chatId}`} value={goal} onChange={(event) => setGoal(event.target.value)} required /><div><button type="submit" disabled={tasks.saving}>Create related Task</button><button type="button" className="quiet-button" onClick={() => setCreating(false)}>Cancel</button></div></form>}
    {tasks.loading ? <p className="loading-state" role="status">Loading related Tasks…</p> : visibleTasks.length === 0 ? <p className="task-relation-empty">{view === 'active' ? 'No active Task is linked to this Chat. Chat remains discussion; Tasks represent decided work.' : 'No closed Task is linked to this Chat.'}</p> : <div className="related-task-list" aria-label={`${view === 'active' ? 'Active' : 'Closed'} related Tasks`}>{visibleTasks.map((task) => <button type="button" key={task.id} onClick={() => setOpenTaskId(task.id)}><span>{task.status}</span>{task.title}</button>)}</div>}
  </section>;
}
