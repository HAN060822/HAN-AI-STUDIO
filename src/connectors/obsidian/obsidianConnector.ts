import { createHash, randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { KnowledgeConnector, KnowledgePreview } from '../../application/knowledge/knowledgeConnector.ts';
import { KnowledgeError, type Knowledge } from '../../core/knowledge/knowledge.ts';

export const OBSIDIAN_DESTINATION = 'Knowledge/AI-Studio-Generated';
export function knowledgeFilename(id: string, title: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new KnowledgeError('invalid_path', 'Knowledge identity is not a safe UUID.');
  const slug = title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/g, '') || 'note';
  return `knowledge-${slug}-${id.toLowerCase()}.md`;
}

export function renderKnowledgeMarkdown(record: Knowledge): string {
  const meta = {
    knowledge_id: record.id, title: record.title, workspace_id: record.workspaceId,
    task_id: record.source.taskId, source_type: record.source.type, source_id: record.source.id,
    execution_id: record.source.executionId, source_updated_at: record.source.sourceUpdatedAt,
    created_at: record.createdAt, approved_for_save_at: record.approvedAt, schema_version: record.schemaVersion,
  };
  return `---\n${Object.entries(meta).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n# ${record.title.replace(/[\r\n]+/g, ' ')}\n\nReviewed Knowledge preserved through AI Studio.\n\n${record.content}\n`;
}

function missing(error: unknown): boolean { return (error as NodeJS.ErrnoException)?.code === 'ENOENT'; }
function regularDirectory(path: string): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new KnowledgeError('unsafe_path', 'The vault or destination contains a link or non-directory. No note was written.');
}

export class ObsidianConnector implements KnowledgeConnector {
  private readonly configuredRoot: string | undefined;
  constructor(vaultRoot?: string) { this.configuredRoot = vaultRoot; }
  private root(): string {
    if (!this.configuredRoot) throw new KnowledgeError('not_configured', 'Set HAN_AI_STUDIO_OBSIDIAN_VAULT to an existing Obsidian vault before saving.');
    if (!isAbsolute(this.configuredRoot)) throw new KnowledgeError('invalid_vault', 'The configured vault root must be an absolute path.');
    try {
      const root = resolve(this.configuredRoot);
      // Reject links/junctions in every component, including configured-root ancestors.
      let current = root;
      while (true) { regularDirectory(current); const parent = resolve(current, '..'); if (parent === current) break; current = parent; }
      regularDirectory(join(root, '.obsidian'));
      return realpathSync(root);
    } catch (error) {
      if (error instanceof KnowledgeError) throw error;
      throw new KnowledgeError('invalid_vault', 'The configured vault must exist, be accessible, and contain an .obsidian directory.');
    }
  }
  private destination(root: string, create: boolean): string {
    let current = root;
    for (const segment of OBSIDIAN_DESTINATION.split('/')) {
      current = join(current, segment);
      try { regularDirectory(current); }
      catch (error) {
        if (!missing(error)) throw error;
        if (create) { mkdirSync(current); regularDirectory(current); }
      }
    }
    const rel = relative(root, current);
    if (rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) throw new KnowledgeError('invalid_path', 'Destination is outside the configured vault.');
    return current;
  }
  preview(record: Knowledge): KnowledgePreview {
    const root = this.root();
    this.destination(root, false);
    return { connectorId: 'obsidian-markdown', destinationId: createHash('sha256').update(root).digest('hex'), destinationLabel: root,
      relativePath: `${OBSIDIAN_DESTINATION}/${knowledgeFilename(record.id, record.title)}`, markdown: renderKnowledgeMarkdown(record) };
  }
  private existingMatches(path: string, markdown: string): boolean {
    try {
      const stat = lstatSync(path);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) throw new KnowledgeError('unsafe_path', 'The target is a link or is not a regular note. No note was overwritten.');
      return readFileSync(path).equals(Buffer.from(markdown, 'utf8'));
    } catch (error) { if (missing(error)) return false; throw error; }
  }
  private approvedPreview(record: Knowledge): KnowledgePreview {
    const preview = this.preview(record);
    if (!record.approvedAt || record.destination?.connectorId !== preview.connectorId || record.destination.destinationId !== preview.destinationId || record.destination.relativePath !== preview.relativePath) {
      throw new KnowledgeError('destination_changed', 'The note must have durable approval for this exact destination.');
    }
    return preview;
  }
  publish(record: Knowledge): { relativePath: string } {
    const preview = this.approvedPreview(record);
    const directory = this.destination(this.root(), true);
    const path = join(directory, knowledgeFilename(record.id, record.title));
    if (this.existingMatches(path, preview.markdown)) return { relativePath: preview.relativePath };
    const temporary = join(directory, `.pending-${record.id}-${randomUUID()}.tmp`);
    let createdTemporary = false;
    try {
      const descriptor = openSync(temporary, 'wx', 0o600);
      createdTemporary = true;
      try { writeFileSync(descriptor, preview.markdown, 'utf8'); fsyncSync(descriptor); } finally { closeSync(descriptor); }
      // Atomic create-if-absent: unlike rename, linking never replaces an existing note.
      try { linkSync(temporary, path); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (!this.existingMatches(path, preview.markdown)) throw new KnowledgeError('note_conflict', 'A different note already occupies this path. It was not overwritten. Inspect the conflict before retrying.');
      }
    } finally { if (createdTemporary) unlinkSync(temporary); }
    return { relativePath: preview.relativePath };
  }
  verify(record: Knowledge): { matches: boolean; relativePath: string } {
    const preview = this.approvedPreview(record);
    const directory = this.destination(this.root(), false);
    return { matches: this.existingMatches(join(directory, knowledgeFilename(record.id, record.title)), preview.markdown), relativePath: preview.relativePath };
  }
}
