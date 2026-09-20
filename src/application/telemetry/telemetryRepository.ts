import type { TelemetryRecord } from '../../core/telemetry/telemetry.ts';
export interface TelemetryRepository {
  append(record: TelemetryRecord): void;
  list(workspaceId: string, executionId: string): TelemetryRecord[];
}
