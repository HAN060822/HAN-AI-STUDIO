import type { Knowledge } from '../../core/knowledge/knowledge.ts';

export interface KnowledgeRepository {
  create(record: Knowledge): Knowledge;
  getById(id: string): Knowledge | null;
  listForWorkspace(workspaceId: string): Knowledge[];
  save(record: Knowledge): Knowledge;
}
