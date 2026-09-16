import type { Knowledge } from '../../core/knowledge/knowledge.ts';

export type KnowledgePreview = Readonly<{
  connectorId: string;
  destinationId: string;
  destinationLabel: string;
  relativePath: string;
  markdown: string;
}>;

export interface KnowledgeConnector {
  // Read-only; preparing a candidate or viewing a preview never creates vault files.
  preview(record: Knowledge): KnowledgePreview;
  publish(record: Knowledge): { relativePath: string };
  verify(record: Knowledge): { matches: boolean; relativePath: string };
}
