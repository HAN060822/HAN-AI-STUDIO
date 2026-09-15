import type { Workspace } from '../../core/workspaces/workspace.ts';

export interface WorkspaceRepository {
  create(workspace: Workspace): Workspace;
  getById(id: string): Workspace | null;
  list(includeArchived: boolean): Workspace[];
  save(workspace: Workspace): Workspace;
}
