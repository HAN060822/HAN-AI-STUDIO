import type { CollaborationRequest, CollaborationResult } from '../../core/collaboration/collaboration.ts';

export async function runCollaboration(request: CollaborationRequest): Promise<CollaborationResult> {
  const response = await fetch('/api/collaborations', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
  });
  const body = await response.json() as { result: CollaborationResult; error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Collaboration is unavailable.');
  return body.result;
}
