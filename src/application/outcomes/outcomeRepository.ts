import type { Artifact } from '../../core/outcomes/artifact.ts';
import type { TaskReport } from '../../core/outcomes/taskReport.ts';

export interface OutcomeRepository {
  createArtifact(artifact: Artifact): Artifact;
  getArtifactById(id: string): Artifact | null;
  listArtifactsForWorkspace(workspaceId: string, taskId?: string): Artifact[];
  getTaskReportById(id: string): TaskReport | null;
  getTaskReportByTaskId(taskId: string): TaskReport | null;
  listTaskReportsForWorkspace(workspaceId: string): TaskReport[];
  saveTaskReport(report: TaskReport): TaskReport;
}
