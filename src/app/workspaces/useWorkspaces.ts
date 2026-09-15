import { useCallback, useEffect, useState } from 'react';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from '../../core/workspaces/workspace';
import { workspaceApi } from './workspaceApi';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setWorkspaces(await workspaceApi.list());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Workspaces could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (operation: () => Promise<Workspace>): Promise<Workspace | null> => {
    setSaving(true);
    setError('');
    try {
      const workspace = await operation();
      setWorkspaces((current) => {
        const exists = current.some((item) => item.id === workspace.id);
        return exists ? current.map((item) => item.id === workspace.id ? workspace : item) : [workspace, ...current];
      });
      return workspace;
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'The workspace change could not be saved.');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    workspaces,
    loading,
    saving,
    error,
    clearError: () => setError(''),
    reload: load,
    create: (input: CreateWorkspaceInput) => run(() => workspaceApi.create(input)),
    update: (id: string, input: UpdateWorkspaceInput) => run(() => workspaceApi.update(id, input)),
    archive: (id: string) => run(() => workspaceApi.archive(id)),
    restore: (id: string) => run(() => workspaceApi.restore(id)),
  };
}

export type WorkspaceController = ReturnType<typeof useWorkspaces>;
