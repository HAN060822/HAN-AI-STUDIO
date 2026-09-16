import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MockProviderAdapter } from '../src/adapters/mock/mockProviderAdapter.ts';
import { AgentInvocationService } from '../src/application/agents/agentInvocationService.ts';
import { initialAgentRegistry } from '../src/application/agents/initialAgentRegistry.ts';
import { OrchestratorService } from '../src/application/collaboration/orchestratorService.ts';
import { ExecutionService } from '../src/application/executions/executionService.ts';
import { LocalExecutionRuntime } from '../src/application/executions/localExecutionRuntime.ts';
import { ProviderAdapterRegistry } from '../src/application/providers/providerAdapterRegistry.ts';
import { SqliteExecutionRepository } from '../src/storage/sqlite/sqliteExecutionRepository.ts';
import { SqliteTaskRepository } from '../src/storage/sqlite/sqliteTaskRepository.ts';
import { SqliteWorkspaceRepository } from '../src/storage/sqlite/sqliteWorkspaceRepository.ts';
import type { ProviderAdapter, ProviderBinding } from '../src/core/providers/provider.ts';

export const executionInput = { goal: 'Preserve bounded useful work', participantAgentIds: ['agent-gpt', 'agent-gemini'], collaborationMode: 'sequential', pauseAfterStep: true, taskId: 'task-a' };
export function executionFixture(adapter: ProviderAdapter<unknown, unknown> = new MockProviderAdapter()) {
  const directory = mkdtempSync(join(tmpdir(), 'han-execution-'));
  const path = join(directory, 'studio.sqlite');
  const workspaces = new SqliteWorkspaceRepository(path);
  const timestamp = new Date().toISOString();
  for (const id of ['workspace-a', 'workspace-b']) workspaces.create({ id, name: id, description: null, status: 'active', createdAt: timestamp, updatedAt: timestamp, archivedAt: null, schemaVersion: 1 });
  const tasks = new SqliteTaskRepository(path);
  tasks.create({ id: 'task-a', workspaceId: 'workspace-a', sourceChatId: null, title: 'Persistent Task', goal: 'Independent Task goal', status: 'draft', createdAt: timestamp, updatedAt: timestamp, completedAt: null, schemaVersion: 1 });
  const repository = new SqliteExecutionRepository(path);
  const binding: ProviderBinding = { providerId: 'mock', adapterId: 'mock', modelId: 'mock-basic', status: 'configured' };
  const invocation = new AgentInvocationService(initialAgentRegistry, new ProviderAdapterRegistry([{ descriptor: adapter.descriptor, adapter }]), new Map([['agent-gpt', binding], ['agent-gemini', binding]]));
  const orchestrator = new OrchestratorService(invocation);
  const runtime = new LocalExecutionRuntime(orchestrator);
  const service = new ExecutionService(repository, workspaces, tasks, runtime);
  return { directory, path, workspaces, tasks, repository, runtime, service, orchestrator, async close() { await service.close(); repository.close(); tasks.close(); workspaces.close(); rmSync(directory, { recursive: true, force: true }); } };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
