import type { Execution } from '../../core/executions/execution.ts';

export interface ExecutionRepository {
  create(execution: Execution): Execution;
  getById(id: string): Execution | null;
  listForWorkspace(workspaceId: string): Execution[];
  listRunning(runtimeId: string): Execution[];
  // Compare-and-swap the full checkpoint, lifecycle, and control intent together.
  save(execution: Execution): Execution;
}
