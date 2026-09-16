import { linkSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { knowledgeFilename, ObsidianConnector, OBSIDIAN_DESTINATION, renderKnowledgeMarkdown } from '../src/connectors/obsidian/obsidianConnector.ts';
import { knowledgeFixture, manualKnowledge } from './knowledgeFixtures.ts';

const fixtures: ReturnType<typeof knowledgeFixture>[] = [];
function fixture() { const f = knowledgeFixture(); fixtures.push(f); return f; }
afterEach(async () => { for (const f of fixtures.splice(0)) await f.closeKnowledge(); });
describe('Obsidian filesystem boundary (temporary vaults only)', () => {
  it('sanitizes Windows/reserved/traversal-like titles and renders safe UTF-8 metadata', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', { ...manualKnowledge, title: '../CON: "x"\n---\n..\\outside?*' });
    const filename = knowledgeFilename(record.id, record.title);
    expect(filename).toMatch(/^knowledge-[a-z0-9-]+\.md$/);
    expect(filename).not.toContain('..'); expect(filename).not.toContain('\\');
    expect(renderKnowledgeMarkdown(record)).toContain('title: "../CON: \\"x\\"\\n---');
    const preview = f.knowledge.preview('workspace-a', record.id);
    const saved = f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: preview.token });
    expect(saved.status).toBe('saved');
    expect(readFileSync(join(f.vault, preview.relativePath), 'utf8')).toBe(renderKnowledgeMarkdown(saved));
  });
  it.each(['../../outside', '..\\outside', 'C:\\outside', '/tmp/outside', 'id.md:stream'])('rejects forged path identity %s', (id) => {
    expect(() => knowledgeFilename(id, 'Name')).toThrow(/UUID/);
  });
  it('gives separate explicit candidates collision-safe names even when titles match', () => {
    const f = fixture(); const a = f.knowledge.create('workspace-a', manualKnowledge); const b = f.knowledge.create('workspace-a', manualKnowledge);
    expect(f.knowledge.preview('workspace-a', a.id).relativePath).not.toBe(f.knowledge.preview('workspace-a', b.id).relativePath);
  });
  it('never overwrites an existing different note and leaves no temporary write behind', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge); const preview = f.knowledge.preview('workspace-a', record.id);
    mkdirSync(join(f.vault, OBSIDIAN_DESTINATION), { recursive: true }); writeFileSync(join(f.vault, preview.relativePath), 'Existing human note', 'utf8');
    const failed = f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: preview.token });
    expect(failed).toMatchObject({ status: 'failed', failure: { code: 'note_conflict' } });
    expect(readFileSync(join(f.vault, preview.relativePath), 'utf8')).toBe('Existing human note');
    expect(readdirSync(join(f.vault, OBSIDIAN_DESTINATION))).toHaveLength(1);
  });
  it('rejects missing, relative, non-directory and non-vault roots without choosing a fallback', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge);
    const file = join(f.directory, 'not-a-directory'); writeFileSync(file, 'untouched');
    for (const root of [undefined, './relative', join(f.directory, 'missing'), file, f.directory]) expect(() => new ObsidianConnector(root).preview(record)).toThrow();
  });
  it('rejects junctions in root and destination before any outside write', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge);
    const outside = join(f.directory, 'outside'); mkdirSync(outside);
    symlinkSync(outside, join(f.vault, 'Knowledge'), 'junction');
    expect(() => f.connector.preview(record)).toThrow(/link/);
    const alias = join(f.directory, 'vault-alias'); symlinkSync(f.vault, alias, 'junction');
    expect(() => new ObsidianConnector(alias).preview(record)).toThrow(/link/);
    expect(readdirSync(outside)).toEqual([]);
  });
  it('surfaces a destination blocked by a file and retains all source data', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge); const preview = f.knowledge.preview('workspace-a', record.id);
    writeFileSync(join(f.vault, 'Knowledge'), 'Existing content');
    expect(() => f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: preview.token })).toThrow(/non-directory/);
    expect(f.knowledge.get('workspace-a', record.id)).toEqual(record);
    expect(readFileSync(join(f.vault, 'Knowledge'), 'utf8')).toBe('Existing content');
  });
  it('rejects a hard-linked target without modifying the other file', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge); const preview = f.knowledge.preview('workspace-a', record.id);
    const outside = join(f.directory, 'outside.md'); writeFileSync(outside, 'Protected outside content');
    mkdirSync(join(f.vault, OBSIDIAN_DESTINATION), { recursive: true }); linkSync(outside, join(f.vault, preview.relativePath));
    const failed = f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: preview.token });
    expect(failed).toMatchObject({ status: 'failed', failure: { code: 'unsafe_path' } });
    expect(readFileSync(outside, 'utf8')).toBe('Protected outside content');
  });
  it('detects a human edit on verify and repeat save without replacing the edit', () => {
    const f = fixture(); const record = f.knowledge.create('workspace-a', manualKnowledge); const preview = f.knowledge.preview('workspace-a', record.id);
    f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: preview.token });
    writeFileSync(join(f.vault, preview.relativePath), 'Human revision');
    expect(f.knowledge.verify('workspace-a', record.id).matches).toBe(false);
    expect(() => f.knowledge.save('workspace-a', record.id, { approved: true, previewToken: f.knowledge.preview('workspace-a', record.id).token })).toThrow(/missing or changed/);
    expect(readFileSync(join(f.vault, preview.relativePath), 'utf8')).toBe('Human revision');
  });
});
