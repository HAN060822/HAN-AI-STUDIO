import { describe, expect, it } from 'vitest';
import type { Workspace } from '../src/core/workspaces/workspace.ts';
import type { WorkspaceRepository } from '../src/application/workspaces/workspaceRepository.ts';
import { WorkspaceNotFoundError, WorkspaceService } from '../src/application/workspaces/workspaceService.ts';

class MemoryWorkspaceRepository implements WorkspaceRepository {
  rows = new Map<string, Workspace>();
  create(workspace: Workspace) { this.rows.set(workspace.id, workspace); return workspace; }
  getById(id: string) { return this.rows.get(id) ?? null; }
  list(includeArchived: boolean) { return [...this.rows.values()].filter((item) => includeArchived || item.status === 'active'); }
  save(workspace: Workspace) { this.rows.set(workspace.id, workspace); return workspace; }
}

describe('Workspace domain service', () => {
  it('creates a typed workspace with a stable ID and permits duplicate names', () => {
    const repository = new MemoryWorkspaceRepository();
    let nextId = 0;
    const service = new WorkspaceService(repository, { createId: () => `id-${++nextId}`, now: () => new Date('2026-09-15T10:00:00.000Z') });
    const first = service.createWorkspace({ name: 'Research', description: '  Durable notes  ' });
    const second = service.createWorkspace({ name: 'Research' });
    expect(first).toMatchObject({ id: 'id-1', name: 'Research', description: 'Durable notes', status: 'active', schemaVersion: 1 });
    expect(second.id).toBe('id-2');
  });

  it('renames without changing identity and preserves archived records through restore', () => {
    const repository = new MemoryWorkspaceRepository();
    let time = 0;
    const service = new WorkspaceService(repository, { createId: () => 'stable-id', now: () => new Date(1_700_000_000_000 + ++time * 1000) });
    const created = service.createWorkspace({ name: 'First name' });
    const renamed = service.updateWorkspace(created.id, { name: 'Second name' });
    expect(renamed.id).toBe(created.id);
    expect(renamed.updatedAt).not.toBe(created.updatedAt);
    expect(service.archiveWorkspace(created.id).status).toBe('archived');
    expect(service.listWorkspaces()).toHaveLength(0);
    expect(service.listWorkspaces(true)).toHaveLength(1);
    expect(service.restoreWorkspace(created.id)).toMatchObject({ id: 'stable-id', status: 'active', archivedAt: null });
  });

  it('rejects empty names and missing workspaces', () => {
    const service = new WorkspaceService(new MemoryWorkspaceRepository());
    expect(() => service.createWorkspace({ name: '  ' })).toThrow('Workspace name is required.');
    expect(() => service.getWorkspace('missing')).toThrow(WorkspaceNotFoundError);
  });
});
