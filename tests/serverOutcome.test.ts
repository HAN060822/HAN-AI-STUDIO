import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { startStudioServer } from '../src/server/httpServer.ts';
import type { Artifact } from '../src/core/outcomes/artifact.ts';
import type { Execution } from '../src/core/executions/execution.ts';
import type { TaskReport } from '../src/core/outcomes/taskReport.ts';

describe('Artifact and Task Report HTTP boundary', () => {
  it('preserves an Execution outcome, reports it, rejects invalid scope, and survives server restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'han-outcome-http-'));
    const options = { port: 0, databasePath: join(directory, 'studio.sqlite') };
    let server = await startStudioServer(options);
    function base() { const address = server.server.address(); if (!address || typeof address === 'string') throw new Error(); return `http://127.0.0.1:${address.port}`; }
    async function request(path: string, method = 'GET', body?: unknown) {
      const response = await fetch(`${base()}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() as { workspace: { id: string }; task: { id: string }; execution: Execution; artifact: Artifact; artifacts: Artifact[]; report: TaskReport; reports: TaskReport[]; code: string } };
    }
    try {
      const workspaceId = (await request('/api/workspaces', 'POST', { name: 'Outcome HTTP' })).body.workspace.id;
      const taskId = (await request(`/api/workspaces/${workspaceId}/tasks`, 'POST', { title: 'Outcome Task', goal: 'Produce a formal result.' })).body.task.id;
      const created = await request(`/api/workspaces/${workspaceId}/executions`, 'POST', { goal: 'Generate source output', participantAgentIds: ['agent-gpt'], collaborationMode: 'sequential', pauseAfterStep: false, taskId });
      await request(`/api/workspaces/${workspaceId}/executions/${created.body.execution.id}/controls`, 'POST', { action: 'start' });
      const done = (await request(`/api/workspaces/${workspaceId}/executions/${created.body.execution.id}`)).body.execution;
      expect(done.status).toBe('completed');
      const preserved = await request(`/api/workspaces/${workspaceId}/artifacts`, 'POST', { title: 'HTTP result', kind: 'result', taskId, sourceExecutionId: done.id, sourceContributionStepId: 'step-1' });
      expect(preserved.status).toBe(201);
      expect(preserved.body.artifact.provenance).toMatchObject({ executionId: done.id, agentId: 'agent-gpt', mode: 'mock' });
      const report = await request(`/api/workspaces/${workspaceId}/task-reports`, 'POST', { taskId });
      expect(report.status).toBe(200); expect(report.body.report.artifacts).toHaveLength(1);
      expect((await request(`/api/workspaces/${workspaceId}/artifacts`, 'POST', { title: 'Bad', kind: 'binary', content: 'x' })).status).toBe(400);
      expect((await request(`/api/workspaces/${workspaceId}/artifacts`, 'POST', { title: 'Bad scope type', kind: 'note', taskId: 42, content: 'x' })).status).toBe(400);
      expect((await request(`/api/workspaces/missing/artifacts`)).status).toBe(404);
      await server.close(); server = await startStudioServer(options);
      expect((await request(`/api/workspaces/${workspaceId}/artifacts`)).body.artifacts).toEqual([preserved.body.artifact]);
      expect((await request(`/api/workspaces/${workspaceId}/task-reports`)).body.reports).toEqual([report.body.report]);
    } finally { await server.close(); rmSync(directory, { recursive: true, force: true }); }
  });
});
