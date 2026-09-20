import { LOCAL_HAN, type PermissionGrant } from '../../core/governance/governance.ts';
export function prototypeGrants(publication: 'review' | 'deny'): PermissionGrant[] {
  return [
    { id: 'local-owner-audit-read-v1', actor: LOCAL_HAN, action: 'READ', resourceType: 'audit', resourceId: '*', scope: { kind: 'global' }, capability: 'audit.read', requiresApproval: false },
    ...(publication === 'review' ? [{ id: 'local-owner-reviewed-knowledge-v1', actor: LOCAL_HAN, action: 'EXTERNAL' as const, resourceType: 'knowledge' as const, resourceId: '*', scope: { kind: 'global' as const }, capability: 'obsidian-markdown.publish', requiresApproval: true }] : []),
  ];
}
