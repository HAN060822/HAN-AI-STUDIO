import type { ExecutionStatus } from '../executions/execution.ts';
import type { TaskStatus } from '../tasks/task.ts';

export const TASK_REPORT_SCHEMA_VERSION = 1 as const;

export type TaskReport = Readonly<{
  id: string;
  workspaceId: string;
  task: Readonly<{
    id: string;
    title: string;
    goal: string;
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  }>;
  outcomeSummary: string;
  executions: readonly Readonly<{
    id: string;
    status: ExecutionStatus;
    goal: string;
    runtimeId: string;
    participantAgentIds: readonly string[];
    contributionCount: number;
    finalContributionStepId: string | null;
    failure: Readonly<{ stepId: string; agentId: string; message: string; code: string }> | null;
    createdAt: string;
    finishedAt: string | null;
  }>[];
  participatingAgents: readonly Readonly<{ agentId: string; displayName: string }>[];
  artifacts: readonly Readonly<{
    id: string;
    title: string;
    kind: string;
    sourceExecutionId: string | null;
    contributionStepId: string | null;
  }>[];
  limitations: readonly string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}>;
