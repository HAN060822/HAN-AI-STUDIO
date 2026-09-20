export const ARTIFACT_SCHEMA_VERSION = 1 as const;

export type ArtifactKind = 'document' | 'result' | 'note';

export type ArtifactProvenance = Readonly<{
  executionId: string | null;
  contributionStepId: string | null;
  agentId: string | null;
  agentDisplayName: string | null;
  providerId: string | null;
  modelId: string | null;
  mode: 'mock' | 'real' | null;
}>;

export type Artifact = Readonly<{
  id: string;
  workspaceId: string;
  taskId: string | null;
  title: string;
  kind: ArtifactKind;
  content: string;
  provenance: ArtifactProvenance;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}>;

export type CreateArtifactInput = Readonly<{
  // Optional caller-generated UUID retained for retries of one immutable creation intent.
  creationId?: string;
  title: string;
  kind: ArtifactKind;
  taskId?: string | null;
  content?: string;
  sourceExecutionId?: string;
  sourceContributionStepId?: string;
}>;

export function isArtifactKind(value: unknown): value is ArtifactKind {
  return value === 'document' || value === 'result' || value === 'note';
}
