export type KnowledgeSourceType = 'manual' | 'artifact' | 'task-report';
export type Knowledge = Readonly<{
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  source: Readonly<{
    type: KnowledgeSourceType;
    id: string | null;
    taskId: string | null;
    executionId: string | null;
    sourceUpdatedAt: string | null;
  }>;
  status: 'candidate' | 'pending' | 'failed' | 'saved';
  destination: Readonly<{ connectorId: string; destinationId: string; relativePath: string }> | null;
  failure: Readonly<{ code: string; message: string }> | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  savedAt: string | null;
  revision: number;
  schemaVersion: number;
}>;

export class KnowledgeError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = 'KnowledgeError'; this.code = code; }
}

export function knowledgeText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0')) {
    throw new KnowledgeError('invalid_input', `${label} must contain 1–${max.toLocaleString('en-US')} characters without null bytes.`);
  }
  return value.trim();
}

export function knowledgeRequest(value: unknown): { sourceType: KnowledgeSourceType; sourceId?: string; title?: string; content?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new KnowledgeError('invalid_input', 'A Knowledge candidate request is required.');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !['sourceType', 'sourceId', 'title', 'content'].includes(key))) throw new KnowledgeError('invalid_input', 'Unsupported candidate field. Destinations and provenance are managed by the application.');
  if (input.sourceType !== 'manual' && input.sourceType !== 'artifact' && input.sourceType !== 'task-report') throw new KnowledgeError('invalid_input', 'Choose Artifact, Task Report, or manual Knowledge.');
  if (input.sourceType === 'manual') {
    if (input.sourceId !== undefined) throw new KnowledgeError('invalid_input', 'Manual Knowledge has no source reference.');
    return { sourceType: 'manual', title: knowledgeText(input.title, 'Title', 180), content: knowledgeText(input.content, 'Content', 100_000) };
  }
  if (input.title !== undefined || input.content !== undefined) throw new KnowledgeError('invalid_input', 'Source-based candidates snapshot the selected outcome. Use manual entry for separately authored content.');
  return { sourceType: input.sourceType, sourceId: knowledgeText(input.sourceId, 'Source ID', 180) };
}
