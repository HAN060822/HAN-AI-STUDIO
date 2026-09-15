export const WORKSPACE_SCHEMA_VERSION = 1 as const;

export type WorkspaceStatus = 'active' | 'archived';

export type Workspace = {
  id: string;
  name: string;
  description: string | null;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
};

export type CreateWorkspaceInput = {
  name: string;
  description?: string | null;
};

export type UpdateWorkspaceInput = {
  name?: string;
  description?: string | null;
};

export class WorkspaceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceValidationError';
  }
}

export function normalizeWorkspaceName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new WorkspaceValidationError('Workspace name is required.');
  if (normalized.length > 120) throw new WorkspaceValidationError('Workspace name must be 120 characters or fewer.');
  return normalized;
}

export function normalizeWorkspaceDescription(description?: string | null): string | null {
  if (description == null) return null;
  const normalized = description.trim();
  if (normalized.length > 1000) throw new WorkspaceValidationError('Workspace description must be 1000 characters or fewer.');
  return normalized || null;
}
