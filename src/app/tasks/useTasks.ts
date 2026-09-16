import { useCallback, useEffect, useState } from 'react';
import type { Task, TaskStatus } from '../../core/tasks/task';
import { taskApi } from './taskApi';

function messageFor(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }

export function useTasks(workspaceId: string, sourceChatId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setTasks(await taskApi.list(workspaceId, sourceChatId)); }
    catch (loadError) { setError(messageFor(loadError, 'Tasks could not be loaded.')); }
    finally { setLoading(false); }
  }, [workspaceId, sourceChatId]);
  useEffect(() => { void reload(); }, [reload]);
  const create = useCallback(async (title: string, goal: string) => {
    setSaving(true); setError('');
    try { const task = await taskApi.create(workspaceId, { title, goal, sourceChatId }); setTasks((current) => [task, ...current]); return task; }
    catch (createError) { setError(messageFor(createError, 'The Task could not be created.')); return null; }
    finally { setSaving(false); }
  }, [workspaceId, sourceChatId]);
  return { tasks, loading, saving, error, reload, create };
}

export function useTask(workspaceId: string, taskId: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setTask(await taskApi.get(workspaceId, taskId)); }
    catch (loadError) { setError(messageFor(loadError, 'The Task could not be loaded.')); }
    finally { setLoading(false); }
  }, [workspaceId, taskId]);
  useEffect(() => { void reload(); }, [reload]);
  const update = useCallback(async (input: { title?: string; goal?: string; status?: TaskStatus }) => {
    setSaving(true); setError('');
    try { const updated = await taskApi.update(workspaceId, taskId, input); setTask(updated); return updated; }
    catch (updateError) { setError(messageFor(updateError, 'The Task could not be updated.')); return null; }
    finally { setSaving(false); }
  }, [workspaceId, taskId]);
  return { task, loading, saving, error, update, reload };
}
