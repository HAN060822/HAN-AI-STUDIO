import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { OutcomeRepository } from '../../application/outcomes/outcomeRepository.ts';
import type { Artifact } from '../../core/outcomes/artifact.ts';
import type { TaskReport } from '../../core/outcomes/taskReport.ts';
import { applyMigrations } from './migrations.ts';

export class SqliteOutcomeRepository implements OutcomeRepository {
  private readonly database: DatabaseSync;
  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    applyMigrations(this.database);
  }
  createArtifact(artifact: Artifact): Artifact {
    this.database.prepare(`INSERT INTO artifacts
      (id, workspace_id, task_id, source_execution_id, kind, created_at, updated_at, schema_version, snapshot_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(artifact.id, artifact.workspaceId, artifact.taskId, artifact.provenance.executionId, artifact.kind, artifact.createdAt, artifact.updatedAt, artifact.schemaVersion, JSON.stringify(artifact));
    return artifact;
  }
  getArtifactById(id: string): Artifact | null {
    const row = this.database.prepare('SELECT snapshot_json FROM artifacts WHERE id = ?').get(id);
    return row ? JSON.parse(String(row.snapshot_json)) as Artifact : null;
  }
  listArtifactsForWorkspace(workspaceId: string, taskId?: string): Artifact[] {
    const rows = taskId === undefined
      ? this.database.prepare('SELECT snapshot_json FROM artifacts WHERE workspace_id = ? ORDER BY updated_at DESC, id ASC').all(workspaceId)
      : this.database.prepare('SELECT snapshot_json FROM artifacts WHERE workspace_id = ? AND task_id = ? ORDER BY updated_at DESC, id ASC').all(workspaceId, taskId);
    return rows.map((row) => JSON.parse(String(row.snapshot_json)) as Artifact);
  }
  getTaskReportById(id: string): TaskReport | null {
    const row = this.database.prepare('SELECT snapshot_json FROM task_reports WHERE id = ?').get(id);
    return row ? JSON.parse(String(row.snapshot_json)) as TaskReport : null;
  }
  getTaskReportByTaskId(taskId: string): TaskReport | null {
    const row = this.database.prepare('SELECT snapshot_json FROM task_reports WHERE task_id = ?').get(taskId);
    return row ? JSON.parse(String(row.snapshot_json)) as TaskReport : null;
  }
  listTaskReportsForWorkspace(workspaceId: string): TaskReport[] {
    return this.database.prepare('SELECT snapshot_json FROM task_reports WHERE workspace_id = ? ORDER BY updated_at DESC, id ASC').all(workspaceId)
      .map((row) => JSON.parse(String(row.snapshot_json)) as TaskReport);
  }
  saveTaskReport(report: TaskReport): TaskReport {
    this.database.exec('BEGIN IMMEDIATE;');
    try {
      this.database.prepare(`INSERT INTO task_reports (id, workspace_id, task_id, created_at, updated_at, schema_version, snapshot_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task_id) DO UPDATE SET updated_at = excluded.updated_at, schema_version = excluded.schema_version, snapshot_json = excluded.snapshot_json`)
        .run(report.id, report.workspaceId, report.task.id, report.createdAt, report.updatedAt, report.schemaVersion, JSON.stringify(report));
      this.database.prepare('DELETE FROM task_report_executions WHERE report_id = ?').run(report.id);
      this.database.prepare('DELETE FROM task_report_artifacts WHERE report_id = ?').run(report.id);
      const executionReference = this.database.prepare('INSERT INTO task_report_executions (report_id, execution_id) VALUES (?, ?)');
      for (const execution of report.executions) executionReference.run(report.id, execution.id);
      const artifactReference = this.database.prepare('INSERT INTO task_report_artifacts (report_id, artifact_id) VALUES (?, ?)');
      for (const artifact of report.artifacts) artifactReference.run(report.id, artifact.id);
      this.database.exec('COMMIT;');
      return report;
    } catch (error) {
      this.database.exec('ROLLBACK;');
      throw error;
    }
  }
  close(): void { this.database.close(); }
}
