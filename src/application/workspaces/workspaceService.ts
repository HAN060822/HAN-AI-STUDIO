import { randomUUID } from 'node:crypto';
import {
  WORKSPACE_SCHEMA_VERSION,
  normalizeWorkspaceDescription,
  normalizeWorkspaceName,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type Workspace,
} from '../../core/workspaces/workspace.ts';
import type { WorkspaceRepository } from './workspaceRepository.ts';

export class WorkspaceNotFoundError extends Error {
  constructor(id: string) {
    super(`Workspace ${id} was not found.`);
    this.name = 'WorkspaceNotFoundError';
  }
}

type WorkspaceServiceOptions = {
  createId?: () => string;
  now?: () => Date;
};

export class WorkspaceService {
  private readonly repository: WorkspaceRepository;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(repository: WorkspaceRepository, options: WorkspaceServiceOptions = {}) {
    this.repository = repository;
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  createWorkspace(input: CreateWorkspaceInput): Workspace {
    const timestamp = this.now().toISOString();
    return this.repository.create({
      id: this.createId(),
      name: normalizeWorkspaceName(input.name),
      description: normalizeWorkspaceDescription(input.description),
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
    });
  }

  listWorkspaces(includeArchived = false): Workspace[] {
    return this.repository.list(includeArchived);
  }

  getWorkspace(id: string): Workspace {
    const workspace = this.repository.getById(id);
    if (!workspace) throw new WorkspaceNotFoundError(id);
    return workspace;
  }

  updateWorkspace(id: string, input: UpdateWorkspaceInput): Workspace {
    const workspace = this.getWorkspace(id);
    return this.repository.save({
      ...workspace,
      name: input.name === undefined ? workspace.name : normalizeWorkspaceName(input.name),
      description: input.description === undefined ? workspace.description : normalizeWorkspaceDescription(input.description),
      updatedAt: this.now().toISOString(),
    });
  }

  archiveWorkspace(id: string): Workspace {
    const workspace = this.getWorkspace(id);
    if (workspace.status === 'archived') return workspace;
    const timestamp = this.now().toISOString();
    return this.repository.save({ ...workspace, status: 'archived', archivedAt: timestamp, updatedAt: timestamp });
  }

  restoreWorkspace(id: string): Workspace {
    const workspace = this.getWorkspace(id);
    if (workspace.status === 'active') return workspace;
    return this.repository.save({ ...workspace, status: 'active', archivedAt: null, updatedAt: this.now().toISOString() });
  }
}
