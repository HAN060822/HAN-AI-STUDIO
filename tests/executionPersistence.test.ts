import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionService } from '../src/application/executions/executionService.ts';
import { SqliteExecutionRepository } from '../src/storage/sqlite/sqliteExecutionRepository.ts';
import { executionFixture, executionInput } from './executionFixtures.ts';

describe('Execution checkpoints and migration', () => {
  it('reconstructs a paused checkpoint from SQLite and resumes only the remaining step', async () => {
    const f = executionFixture();
    try {
      const e = f.service.create('workspace-a', executionInput);
      f.service.control('workspace-a', e.id, 'start'); await f.service.waitForIdle(e.id);
      const checkpoint = f.service.get('workspace-a', e.id);
      const reopened = new SqliteExecutionRepository(f.path);
      const service = new ExecutionService(reopened, f.workspaces, f.tasks, f.runtime);
      const run = vi.spyOn(f.runtime, 'runNext');
      try {
        service.recoverInterrupted();
        expect(service.get('workspace-a', e.id)).toEqual(checkpoint);
        service.control('workspace-a', e.id, 'resume'); await service.waitForIdle(e.id);
        expect(run).toHaveBeenCalledTimes(1);
        expect(run.mock.calls[0][1]).toHaveLength(1);
        expect(service.get('workspace-a', e.id)).toMatchObject({ status: 'completed', checkpoint: { nextStepIndex: 2 } });
      } finally { await service.close(); reopened.close(); }
    } finally { await f.close(); }
  });

  it('marks persisted running work interrupted on startup without replaying uncertain in-flight work', async () => {
    const f = executionFixture();
    try {
      const e = f.service.create('workspace-a', executionInput);
      f.service.control('workspace-a', e.id, 'start'); await f.service.waitForIdle(e.id);
      const paused = f.service.get('workspace-a', e.id);
      // Exact durable shape left by loss of a process during the second invocation.
      f.repository.save({ ...paused, status: 'running', checkpoint: { ...paused.checkpoint, currentStepId: 'step-2' } });
      const reopened = new SqliteExecutionRepository(f.path);
      const service = new ExecutionService(reopened, f.workspaces, f.tasks, f.runtime);
      const run = vi.spyOn(f.runtime, 'runNext');
      try {
        service.recoverInterrupted();
        const recovered = service.get('workspace-a', e.id);
        expect(recovered).toMatchObject({ status: 'interrupted', failure: { code: 'runtime_interrupted', agentId: 'agent-gemini', stepId: 'step-2' }, checkpoint: { nextStepIndex: 1, contributions: paused.checkpoint.contributions } });
        expect(() => service.control('workspace-a', e.id, 'resume')).toThrow();
        expect(run).not.toHaveBeenCalled();
      } finally { await service.close(); reopened.close(); }
    } finally { await f.close(); }
  });

  it('applies only additive Migration 4 to a schema-v3 fixture and preserves prior records', async () => {
    const f = executionFixture();
    try {
      const database = new DatabaseSync(f.path);
      // Temporary fixture only: recreate the exact pre-Stage-8 schema version.
      database.exec("DROP TABLE executions; DELETE FROM schema_migrations WHERE version = 4; PRAGMA user_version = 3;");
      const beforeTask = f.tasks.getById('task-a');
      const beforeWorkspace = f.workspaces.getById('workspace-a');
      database.exec("INSERT INTO chats VALUES ('chat-old','workspace-a','Old Chat','active','2026-09-16','2026-09-16',1); INSERT INTO messages VALUES ('message-old','chat-old','user','Retain this','2026-09-16',1);");
      const upgraded = new SqliteExecutionRepository(f.path);
      try {
        expect(database.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((row) => row.version)).toEqual([1, 2, 3, 4]);
        expect(database.prepare('PRAGMA user_version').get()?.user_version).toBe(4);
        expect(f.tasks.getById('task-a')).toEqual(beforeTask);
        expect(f.workspaces.getById('workspace-a')).toEqual(beforeWorkspace);
        expect(database.prepare("SELECT content FROM messages WHERE id = 'message-old'").get()?.content).toBe('Retain this');
        expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
        const e = f.service.create('workspace-a', executionInput);
        expect(upgraded.getById(e.id)).toEqual(e);
        database.exec('PRAGMA foreign_keys = ON;');
        expect(() => database.exec("DELETE FROM tasks WHERE id = 'task-a'")).toThrow();
      } finally { upgraded.close(); database.close(); }
    } finally { await f.close(); }
  });

  it('retains cancelled, failed and completed states across repository reopen', async () => {
    const f = executionFixture();
    try {
      const cancelled = f.service.create('workspace-a', executionInput); f.service.control('workspace-a', cancelled.id, 'cancel');
      const done = f.service.create('workspace-a', { ...executionInput, pauseAfterStep: false }); f.service.control('workspace-a', done.id, 'start'); await f.service.waitForIdle(done.id);
      const failed = f.service.create('workspace-a', { ...executionInput, participantAgentIds: ['agent-codex'] }); f.service.control('workspace-a', failed.id, 'start'); await f.service.waitForIdle(failed.id);
      const reopened = new SqliteExecutionRepository(f.path);
      try { for (const id of [cancelled.id, done.id, failed.id]) expect(reopened.getById(id)).toEqual(f.service.get('workspace-a', id)); }
      finally { reopened.close(); }
    } finally { await f.close(); }
  });
});
