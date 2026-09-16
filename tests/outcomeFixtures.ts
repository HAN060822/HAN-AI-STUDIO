import { OutcomeService } from '../src/application/outcomes/outcomeService.ts';
import { SqliteOutcomeRepository } from '../src/storage/sqlite/sqliteOutcomeRepository.ts';
import { executionFixture, executionInput } from './executionFixtures.ts';

export function outcomeFixture() {
  const execution = executionFixture();
  const repository = new SqliteOutcomeRepository(execution.path);
  let id = 0;
  const service = new OutcomeService(repository, execution.workspaces, execution.tasks, execution.repository, {
    createId: () => `outcome-${++id}`,
    now: () => new Date('2026-09-16T12:00:00.000Z'),
  });
  return {
    ...execution, outcomeRepository: repository, outcomeService: service,
    async completedExecution() {
      const created = execution.service.create('workspace-a', { ...executionInput, pauseAfterStep: false });
      execution.service.control('workspace-a', created.id, 'start');
      await execution.service.waitForIdle(created.id);
      return execution.service.get('workspace-a', created.id);
    },
    async closeOutcomes() { repository.close(); await execution.close(); },
  };
}
