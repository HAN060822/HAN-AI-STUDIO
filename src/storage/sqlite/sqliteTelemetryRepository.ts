import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { TelemetryRepository } from '../../application/telemetry/telemetryRepository.ts';
import type { TelemetryRecord } from '../../core/telemetry/telemetry.ts';
import { applyMigrations } from './migrations.ts';
export class SqliteTelemetryRepository implements TelemetryRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true }); this.database = new DatabaseSync(path);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;'); applyMigrations(this.database);
  }
  append(record: TelemetryRecord): void {
    const scope = record.context.scope;
    if (!scope) throw new Error('Execution telemetry requires an operation scope.');
    const execution = this.database.prepare('SELECT snapshot_json FROM executions WHERE id = ? AND workspace_id = ?').get(scope.executionId, scope.workspaceId);
    if (!execution) throw new Error('Telemetry scope does not exist.');
    const snapshot = JSON.parse(String(execution.snapshot_json));
    if (snapshot.taskId !== scope.taskId || !snapshot.plan.steps.some((step: {id: string; agentId: string}) => step.id === scope.stepId && step.agentId === record.agentId)) throw new Error('Telemetry step scope does not match.');
    // Explicit projection: metadata only, no ContextPackage input or adapter payloads.
    const context = record.context;
    const safe: TelemetryRecord = { invocationId: record.invocationId, phase: record.phase, schemaVersion: 1,
      agentId: record.agentId, providerId: record.providerId, modelId: record.modelId, mode: record.mode,
      context: { id: context.id, schemaVersion: 1, scope: { workspaceId: scope.workspaceId, taskId: scope.taskId, executionId: scope.executionId, stepId: scope.stepId },
        items: context.items.map((item) => ({ kind: item.kind, sourceType: item.sourceType, sourceId: item.sourceId, sourceStepId: item.sourceStepId, reason: item.reason, delivery: item.delivery, originalChars: item.originalChars, suppliedChars: item.suppliedChars, truncated: item.truncated })),
        omitted: [...context.omitted], inputChars: context.inputChars, inputBytes: context.inputBytes, inputFingerprint: context.inputFingerprint, maxInputChars: 2000 },
      startedAt: record.startedAt, completedAt: record.completedAt, durationMs: record.durationMs, status: record.status, code: record.code,
      usage: { source: record.usage.source, inputTokens: record.usage.inputTokens, outputTokens: record.usage.outputTokens, totalTokens: record.usage.totalTokens }, cost: null };
    this.database.prepare('INSERT INTO invocation_telemetry (invocation_id, phase, workspace_id, execution_id, step_id, snapshot_json) VALUES (?, ?, ?, ?, ?, ?)').run(safe.invocationId, safe.phase, scope.workspaceId, scope.executionId, scope.stepId, JSON.stringify(safe));
  }
  list(workspaceId: string, executionId: string): TelemetryRecord[] {
    return this.database.prepare('SELECT snapshot_json FROM invocation_telemetry WHERE workspace_id = ? AND execution_id = ? ORDER BY sequence ASC LIMIT 100').all(workspaceId, executionId).map((row) => JSON.parse(String(row.snapshot_json)) as TelemetryRecord);
  }
  close(): void { this.database.close(); }
}
