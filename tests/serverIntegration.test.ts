import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';
import type { Workspace } from '../src/core/workspaces/workspace.ts';
import type { Task } from '../src/core/tasks/task.ts';
import type { Execution } from '../src/core/executions/execution.ts';
import type { Artifact } from '../src/core/outcomes/artifact.ts';
import type { TaskReport } from '../src/core/outcomes/taskReport.ts';
import type { Knowledge } from '../src/core/knowledge/knowledge.ts';
import type { AuditEvent } from '../src/core/governance/governance.ts';
import type { TelemetryRecord } from '../src/core/telemetry/telemetry.ts';

type Body = { workspace: Workspace; task: Task; chat: { id: string }; messages: { content: string }[]; execution: Execution; executions: Execution[]; artifact: Artifact; artifacts: Artifact[]; report: TaskReport; reports: TaskReport[]; record: Knowledge; records: TelemetryRecord[]; events: AuditEvent[]; preview: { token: string; relativePath: string }; verification: { matches: boolean }; session: string; code: string };
async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'han-stage13-'));
  const databasePath = join(directory, 'studio.sqlite'); const vault = join(directory, 'vault');
  mkdirSync(join(vault, '.obsidian'), { recursive: true });
  const sentinel = join(vault, 'unrelated.md'); writeFileSync(sentinel, 'Unrelated note must remain unchanged.');
  const options = { port: 0, databasePath, obsidianVaultRoot: vault };
  let server = await startStudioServer(options);
  let running = true;
  async function request(path: string, expected = 200, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
    const address = server.server.address(); if (!address || typeof address === 'string') throw new Error('Server is not listening.');
    // Each observation opens a fresh connection, including an immediate same-port restart.
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { 'content-type': 'application/json', connection: 'close', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json() as Body; expect(response.status, JSON.stringify(result)).toBe(expected); return result;
  }
  async function restart(change: Partial<Parameters<typeof startStudioServer>[0]> = {}, stopped?: () => void) { if (running) await server.close(); running = false; stopped?.(); server = await startStudioServer({ ...options, ...change }); running = true; }
  function sql<T>(read: (db: DatabaseSync) => T): T { const db = new DatabaseSync(databasePath); try { return read(db); } finally { db.close(); } }
  async function settled(path: string) {
    for (let i = 0; i < 200; i++) { const { execution } = await request(path); if (execution.status !== 'running') return execution; await new Promise((resolve) => setTimeout(resolve, 10)); }
    throw new Error('Execution did not reach a safe boundary.');
  }
  async function create(goal = 'Stage 13 integrated useful work') {
    const workspace = (await request('/api/workspaces', 201, 'POST', { name: 'Stage 13 isolated integration' })).workspace;
    const base = `/api/workspaces/${workspace.id}`;
    const chat = (await request(`${base}/chats`, 201, 'POST', { title: 'Goal discussion' })).chat;
    await request(`${base}/chats/${chat.id}/messages`, 201, 'POST', { content: 'PRIVATE-CHAT-NOT-AUTO-CONTEXT' });
    const task = (await request(`${base}/tasks`, 201, 'POST', { title: 'Stage 13 Task', goal, sourceChatId: chat.id })).task;
    const execution = (await request(`${base}/executions`, 201, 'POST', { taskId: task.id, goal, collaborationMode: 'sequential', participantAgentIds: ['agent-gpt', 'agent-gemini'], pauseAfterStep: true })).execution;
    return { workspace, base, chat, task, execution, path: `${base}/executions/${execution.id}` };
  }
  return { request, restart, sql, settled, create, vault, sentinel, port() { const address = server.server.address(); if (!address || typeof address === 'string') throw new Error(); return address.port; }, async close() { if (running) await server.close(); expect(readFileSync(sentinel, 'utf8')).toBe('Unrelated note must remain unchanged.'); rmSync(directory, { recursive: true, force: true }); } };
}

describe('Stage 13 real HTTP closed loop and restart recovery', () => {
  it('fails invalid startup recovery explicitly, preserves its checkpoint and releases the listener for a corrected test fixture', async () => {
    const f = await fixture();
    try {
      const a = await f.create();
      await f.request(`${a.path}/controls`, 202, 'POST', { action: 'start' }); const paused = await f.settled(a.path); const port = f.port();
      const invalid = { ...paused, status: 'running', checkpoint: { ...paused.checkpoint, nextStepIndex: 2 } };
      await expect(f.restart({ port }, () => f.sql((db) => db.prepare("UPDATE executions SET status = 'running', snapshot_json = ? WHERE id = ?").run(JSON.stringify(invalid), paused.id)))).rejects.toHaveProperty('code', 'invalid_checkpoint');
      expect(f.sql((db) => JSON.parse(String(db.prepare('SELECT snapshot_json FROM executions WHERE id = ?').get(paused.id)?.snapshot_json)))).toEqual(invalid);
      // Test-only restoration; the application never repairs or guesses corrupted state.
      await f.restart({ port }, () => f.sql((db) => db.prepare("UPDATE executions SET status = 'paused', snapshot_json = ? WHERE id = ?").run(JSON.stringify(paused), paused.id)));
      expect((await f.request(a.path)).execution).toEqual(paused);
      expect((await f.request(`${a.path}/telemetry`)).records).toHaveLength(2);
    } finally { await f.close(); }
  });
  it('continues a Chat-linked Task at the next step, preserves formal outcomes, governs publication and reloads all evidence without duplication', async () => {
    const f = await fixture();
    try {
      const { workspace, base, chat, task, path } = await f.create();
      await f.request(`${path}/controls`, 202, 'POST', { action: 'start' }); const paused = await f.settled(path);
      expect(paused.status).toBe('paused'); expect(paused.checkpoint.contributions).toHaveLength(1);
      const firstTelemetry = (await f.request(`${path}/telemetry`)).records;
      await f.restart();
      expect((await f.request(`${base}`)).workspace).toEqual(workspace);
      expect((await f.request(`${base}/tasks/${task.id}`)).task).toEqual(task);
      expect((await f.request(`${base}/chats/${chat.id}/messages`)).messages[0].content).toBe('PRIVATE-CHAT-NOT-AUTO-CONTEXT');
      expect((await f.request(path)).execution).toEqual(paused); expect((await f.request(`${path}/telemetry`)).records).toEqual(firstTelemetry);
      await f.request(`${path}/controls`, 202, 'POST', { action: 'resume' }); const completed = await f.settled(path);
      expect(completed.status).toBe('completed'); expect(completed.checkpoint.contributions[0]).toEqual(paused.checkpoint.contributions[0]);
      expect(JSON.stringify(completed)).not.toContain('PRIVATE-CHAT-NOT-AUTO-CONTEXT');
      await f.request(`${path}/controls`, 409, 'POST', { action: 'resume' });
      const telemetry = (await f.request(`${path}/telemetry`)).records; expect(telemetry).toHaveLength(4);
      expect(new Set(telemetry.map((item) => item.invocationId)).size).toBe(2);
      expect(telemetry.filter((item) => item.phase === 'final').every((item) => item.status === 'succeeded' && item.usage.source === 'synthetic' && item.cost === null)).toBe(true);
      const input = { creationId: randomUUID(), title: 'Stage 13 retained result', kind: 'result', taskId: task.id, sourceExecutionId: completed.id, sourceContributionStepId: 'step-2' };
      const artifact = (await f.request(`${base}/artifacts`, 201, 'POST', input)).artifact;
      // Simulate losing the response: resend the same intent, including after restart.
      expect((await f.request(`${base}/artifacts`, 201, 'POST', input)).artifact).toEqual(artifact);
      await f.request(`${base}/artifacts`, 409, 'POST', { ...input, title: 'Changed intent' });
      const report = (await f.request(`${base}/task-reports`, 200, 'POST', { taskId: task.id })).report;
      expect((await f.request(`${base}/task-reports`, 200, 'POST', { taskId: task.id })).report.id).toBe(report.id);
      const candidate = (await f.request(`${base}/knowledge`, 201, 'POST', { sourceType: 'artifact', sourceId: artifact.id })).record;
      const reportCandidate = (await f.request(`${base}/knowledge`, 201, 'POST', { sourceType: 'task-report', sourceId: report.id })).record;
      expect(reportCandidate.status).toBe('candidate');
      const knowledgePath = `${base}/knowledge/${candidate.id}`;
      const preview = (await f.request(`${knowledgePath}/preview`)).preview;
      const session = (await f.request('/api/governance/session')).session; const headers = { 'x-han-session': session };
      await f.request(`${knowledgePath}/save`, 409, 'POST', { previewToken: preview.token }, headers);
      await f.request(`${knowledgePath}/save`, 409, 'POST', { approved: true, previewToken: 'stale' }, headers);
      const saved = (await f.request(`${knowledgePath}/save`, 200, 'POST', { approved: true, previewToken: preview.token }, headers)).record;
      expect(saved.status).toBe('saved'); expect((await f.request(`${knowledgePath}/verify`)).verification.matches).toBe(true);
      const bytes = readFileSync(join(f.vault, preview.relativePath));
      const fresh = (await f.request(`${knowledgePath}/preview`)).preview;
      expect((await f.request(`${knowledgePath}/save`, 200, 'POST', { approved: true, previewToken: fresh.token }, headers)).record).toEqual(saved);
      const audit = (await f.request(`${knowledgePath}/audit`)).events;
      expect(audit.filter((item) => item.outcome === 'succeeded')).toHaveLength(1);
      expect(audit[0]).toMatchObject({ outcome: 'not_executed', code: 'already_saved_verified' });
      const approvals = f.sql((db) => db.prepare('SELECT * FROM authority_approvals ORDER BY id').all());
      await f.restart();
      expect((await f.request(path)).execution).toEqual(completed);
      expect((await f.request(`${path}/telemetry`)).records).toEqual(telemetry);
      expect((await f.request(`${base}/artifacts`, 201, 'POST', input)).artifact).toEqual(artifact);
      expect((await f.request(`${base}/artifacts`)).artifacts).toHaveLength(1);
      expect((await f.request(`${base}/task-reports`)).reports).toHaveLength(1);
      expect((await f.request(knowledgePath)).record).toEqual(saved);
      expect((await f.request(`${base}/knowledge/${reportCandidate.id}`)).record).toEqual(reportCandidate);
      expect((await f.request(`${knowledgePath}/audit`)).events).toEqual(audit);
      expect(f.sql((db) => db.prepare('SELECT * FROM authority_approvals ORDER BY id').all())).toEqual(approvals);
      expect((await f.request(`${knowledgePath}/verify`)).verification.matches).toBe(true);
      expect(readFileSync(join(f.vault, preview.relativePath))).toEqual(bytes);
      expect(readdirSync(join(f.vault, 'Knowledge', 'AI-Studio-Generated'))).toHaveLength(1);
      expect((await f.request(`${base}/tasks/${task.id}`)).task.status).toBe('draft');
      // A pre-restart local session cannot manufacture fresh authority.
      await f.request(`${knowledgePath}/save`, 403, 'POST', { approved: true, previewToken: fresh.token }, headers);
      expect(f.sql((db) => db.prepare('PRAGMA foreign_key_check').all())).toEqual([]);
      expect(f.sql((db) => db.prepare('PRAGMA integrity_check').get()?.integrity_check)).toBe('ok');
    } finally { await f.close(); }
  });

  it('keeps cancellation terminal, preserves work when a remaining backend is unavailable, and rejects inconsistent recovered state', async () => {
    const f = await fixture();
    try {
      const a = await f.create('Cancel after useful work');
      await f.request(`${a.path}/controls`, 202, 'POST', { action: 'start' }); const paused = await f.settled(a.path);
      const cancelled = (await f.request(`${a.path}/controls`, 202, 'POST', { action: 'cancel' })).execution;
      const b = await f.create('Backend unavailable after restart');
      await f.request(`${b.path}/controls`, 202, 'POST', { action: 'start' }); const before = await f.settled(b.path);
      await f.restart({ providerMode: 'none' });
      expect((await f.request(a.path)).execution).toEqual(cancelled);
      await f.request(`${a.path}/controls`, 409, 'POST', { action: 'resume' });
      expect(cancelled.checkpoint.contributions).toEqual(paused.checkpoint.contributions);
      await f.request(`${b.path}/controls`, 202, 'POST', { action: 'resume' }); const failed = await f.settled(b.path);
      expect(failed.status).toBe('failed'); expect(failed.failure?.code).toBe('agent_unavailable');
      expect(failed.checkpoint.contributions).toEqual(before.checkpoint.contributions);
      expect((await f.request(`${b.path}/telemetry`)).records).toHaveLength(2);
      const artifact = (await f.request(`${b.base}/artifacts`, 201, 'POST', { title: 'Useful failed-run output', kind: 'result', sourceExecutionId: failed.id, sourceContributionStepId: 'step-1' })).artifact;
      expect(artifact.content).toBe(before.checkpoint.contributions[0].output);
      const report = (await f.request(`${b.base}/task-reports`, 200, 'POST', { taskId: b.task.id })).report;
      expect(report.executions[0]).toMatchObject({ status: 'failed', contributionCount: 1, finalContributionStepId: null });
      await f.restart(); expect((await f.request(b.path)).execution).toEqual(failed);
      // Only the disposable fixture is deliberately corrupted; no repair/invented state.
      f.sql((db) => db.prepare('UPDATE executions SET snapshot_json = ? WHERE id = ?').run(JSON.stringify({ ...cancelled, status: 'paused', checkpoint: { ...cancelled.checkpoint, nextStepIndex: 2 } }), cancelled.id));
      expect((await f.request(a.path, 409)).code).toBe('invalid_checkpoint');
      await f.request(`${a.path}/controls`, 409, 'POST', { action: 'resume' });
      expect((await f.request(`${a.base}/executions`, 409)).code).toBe('invalid_checkpoint');
      expect(f.sql((db) => db.prepare('SELECT COUNT(*) AS n FROM invocation_telemetry WHERE execution_id = ?').get(cancelled.id)?.n)).toBe(2);
    } finally { await f.close(); }
  });

  it('recovers an abrupt-stop checkpoint as Interrupted without replaying an uncertain step or inventing final telemetry', async () => {
    const f = await fixture();
    try {
      const a = await f.create('Interrupted between checkpoints');
      await f.request(`${a.path}/controls`, 202, 'POST', { action: 'start' }); const paused = await f.settled(a.path);
      const evidence = (await f.request(`${a.path}/telemetry`)).records;
      await f.restart({}, () => f.sql((db) => {
        const interrupted = { ...paused, status: 'running', checkpoint: { ...paused.checkpoint, currentStepId: 'step-2' } };
        db.prepare("UPDATE executions SET status = 'running', snapshot_json = ? WHERE id = ?").run(JSON.stringify(interrupted), paused.id);
      }));
      const recovered = (await f.request(a.path)).execution;
      expect(recovered).toMatchObject({ status: 'interrupted', failure: { code: 'runtime_interrupted', stepId: 'step-2' } });
      expect(recovered.checkpoint).toEqual({ ...paused.checkpoint, currentStepId: 'step-2' });
      await f.request(`${a.path}/controls`, 409, 'POST', { action: 'resume' });
      expect((await f.request(`${a.path}/telemetry`)).records).toEqual(evidence);
      await f.restart(); expect((await f.request(a.path)).execution).toEqual(recovered);
    } finally { await f.close(); }
  });
});
