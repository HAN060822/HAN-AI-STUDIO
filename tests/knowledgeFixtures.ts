import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { KnowledgeService } from '../src/application/knowledge/knowledgeService.ts';
import { ObsidianConnector } from '../src/connectors/obsidian/obsidianConnector.ts';
import { SqliteKnowledgeRepository } from '../src/storage/sqlite/sqliteKnowledgeRepository.ts';
import { outcomeFixture } from './outcomeFixtures.ts';

export const manualKnowledge = { sourceType: 'manual', title: 'Useful knowledge 知识', content: 'A reviewed reusable observation.\n\nUTF-8: 知识。' };
export function knowledgeFixture() {
  const f = outcomeFixture();
  const vault = join(f.directory, 'vault');
  mkdirSync(join(vault, '.obsidian'), { recursive: true });
  const knowledgeRepository = new SqliteKnowledgeRepository(f.path);
  const connector = new ObsidianConnector(vault);
  const knowledge = new KnowledgeService(knowledgeRepository, f.workspaces, f.outcomeRepository, connector);
  return { ...f, vault, knowledgeRepository, connector, knowledge,
    async closeKnowledge() { knowledgeRepository.close(); await f.closeOutcomes(); } };
}
