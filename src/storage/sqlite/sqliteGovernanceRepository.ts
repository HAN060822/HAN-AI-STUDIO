import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Approval, AuditEvent } from '../../core/governance/governance.ts';
import type { GovernanceRepository } from '../../application/governance/governanceRepository.ts';
import { applyMigrations } from './migrations.ts';

export class SqliteGovernanceRepository implements GovernanceRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true }); this.database = new DatabaseSync(path);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;'); applyMigrations(this.database);
  }
  begin(event: AuditEvent, approval: Approval | null): void {
    this.database.exec('BEGIN IMMEDIATE;');
    try {
      if (approval) this.database.prepare('INSERT INTO authority_approvals (id, workspace_id, consumed_at, snapshot_json) VALUES (?, ?, ?, ?)').run(approval.id, approval.intent.scope.kind === 'global' ? null : approval.intent.scope.workspaceId, event.timestamp, JSON.stringify(approval));
      this.append(event); this.database.exec('COMMIT;');
    } catch (error) { this.database.exec('ROLLBACK;'); throw error; }
  }
  append(event: AuditEvent): void {
    this.database.prepare('INSERT INTO audit_events (id, attempt_id, workspace_id, resource_type, resource_id, approval_id, snapshot_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(event.id, event.attemptId, event.intent.scope.kind === 'global' ? null : event.intent.scope.workspaceId, event.intent.resource.type, event.intent.resource.id, event.approvalId, JSON.stringify(event));
  }
  list(workspaceId: string | null, resourceType: string, resourceId: string, limit = 20): AuditEvent[] {
    return this.database.prepare('SELECT snapshot_json FROM audit_events WHERE workspace_id IS ? AND resource_type = ? AND resource_id = ? ORDER BY sequence DESC LIMIT ?').all(workspaceId, resourceType, resourceId, Math.max(1, Math.min(100, Math.floor(limit)))).map((row) => JSON.parse(String(row.snapshot_json)) as AuditEvent);
  }
  getApproval(id: string): (Approval & { consumedAt: string }) | null {
    const row = this.database.prepare('SELECT snapshot_json, consumed_at FROM authority_approvals WHERE id = ?').get(id);
    return row ? { ...JSON.parse(String(row.snapshot_json)), consumedAt: String(row.consumed_at) } : null;
  }
  close(): void { this.database.close(); }
}
