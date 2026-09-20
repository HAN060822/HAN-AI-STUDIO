export type ExecutionContextScope = Readonly<{ workspaceId: string; taskId: string | null; executionId: string; stepId: string }>;
export type ContextItem = Readonly<{
  kind: 'goal' | 'instruction' | 'handoff' | 'explicit-input' | 'workspace' | 'task' | 'execution';
  sourceType: 'request' | 'policy' | 'contribution' | 'workspace' | 'task' | 'execution';
  sourceId: string | null;
  sourceStepId: string | null;
  reason: 'current-goal' | 'next-action' | 'previous-contribution' | 'explicit-request' | 'operation-scope';
  delivery: 'supplied' | 'reference-only';
  originalChars: number;
  suppliedChars: number;
  truncated: boolean;
}>;
// Metadata only. Full input exists only in the transient ContextPackage, not telemetry.
export type ContextSnapshot = Readonly<{
  id: string; schemaVersion: 1; scope: ExecutionContextScope | null;
  items: readonly ContextItem[];
  omitted: readonly string[];
  inputChars: number; inputBytes: number; inputFingerprint: string;
  maxInputChars: 2000;
}>;
export type ContextPackage = Readonly<{ input: string; snapshot: ContextSnapshot }>;
export class ContextError extends Error {
  constructor() { super('Context could not be constructed or validated within the operation bounds. No provider call was made.'); this.name = 'ContextError'; }
}
