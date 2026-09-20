import type { Approval, AuditEvent } from '../../core/governance/governance.ts';
export interface GovernanceRepository {
  // Approval consumption and pre-action audit are one atomic operation. An ID is usable once.
  begin(event: AuditEvent, approval: Approval | null): void;
  append(event: AuditEvent): void;
  list(workspaceId: string | null, resourceType: string, resourceId: string, limit?: number): AuditEvent[];
  getApproval(id: string): (Approval & { consumedAt: string }) | null;
}
