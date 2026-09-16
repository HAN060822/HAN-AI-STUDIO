# Stage 10 — Knowledge Interface + Obsidian Connector

## Gate and baseline

Builder complete; awaiting Architect review and HAN acceptance. Not independently sealed. **NOT PUSHED. Stage 11 NOT STARTED.**

Started from clean synchronized `main == origin/main` at `a0d41c9866f982ca70ed7aa3e8a1734e3d0fce9a` (`Complete Phase 9 Stage 9 artifact and task report`), confirmed before implementation. The handoff identifies Stage 9 as PASS / HANDS-ON PASS / INDEPENDENT VERIFIED / PUSHED / SEALED.

## Configuration and human procedure

1. Use Node 24+ and npm 11+. Keep the local server bound to `127.0.0.1` and run one server per database.
2. In ignored `.env.local`, set `HAN_AI_STUDIO_OBSIDIAN_VAULT` to an existing absolute Obsidian vault containing `.obsidian`. Process environment overrides local-file values. `.env.example` documents the key without a personal path. No configuration means candidates work locally but Save is visibly unavailable.
3. Run `npm.cmd run dev`. Startup reports `Mock test backend` and `Obsidian configured; review required before save`. Restart after changing configuration or connector/application-service source; the existing watcher monitors `src/server` only.
4. Open a Workspace. Create a Task, link and complete a Mock Execution, preserve a contribution as an Artifact, and generate a Task Report through the existing panels.
5. In **Reviewed Knowledge**, select an Artifact, Task Report, or Manual Knowledge. Use **Refresh Knowledge** after creating new source outcomes. **Prepare for Review** persists a local candidate only.
6. Inspect content, source/Task reference, exact configured vault and generated relative path. Expand **Markdown preview**. The Save button stays disabled until approval is checked. Preview shows an unapproved timestamp until the first explicit save attempt; confirmed save time is displayed separately.
7. Check approval, select **Save Reviewed Knowledge**, and require status `saved`, confirmed timestamp, resulting path and **Verify Saved Note**. Enter/Space operate the native controls as well as normal pointer input.
8. Inspect the resulting UTF-8 `.md` file and use Verify. Browser refresh returns to Home; reopen the Workspace and saved history. Stop/start the runtime, reopen again, and Verify the same identity/path/content. No second note should appear.
9. A separate deliberately prepared candidate has a different UUID/file. An existing different note at the chosen name is never overwritten. If a save failed or is pending, restore the underlying configuration/filesystem, refresh/review, and explicitly approve Retry. No background retry or fallback directory exists.

Do not repeat real-vault fault/destructive tests. Automated failure tests use temporary vaults only. Canonical architecture notes are never disposable test targets.

## Automated evidence

- `npm.cmd test`: **28 test files / 164 tests passed**, no React `act(...)` warning.
- Prior baseline: 23 files / 122 tests; all Stage 1–9 tests remain green. Stage 10 adds **42 tests in 5 files**, plus one fixture helper.
- `tests/knowledge.test.ts`: validation; manual/Artifact/report snapshots; source immutability; Workspace integrity; explicit/fresh approval; repeat-save identity; failed writes and retry; initial approval-persistence failure prevents publish; post-publication confirmation failure recovers on explicit retry; missing/changed configuration.
- `tests/obsidian.test.ts`: UTF-8/frontmatter rendering; safe names including Windows-reserved/traversal-like input; forged path identities; duplicate-title collision behavior; no-overwrite; root validation; junction escapes; blocked destination; hard-linked target; human-edited note detection.
- `tests/knowledgePersistence.test.ts`: persisted snapshot/schema version/revision and destination reload, stale CAS rejection, populated Stage 9 → 10 additive migration preserving prior records and restrictive references.
- `tests/serverKnowledge.test.ts`: real local HTTP prepare/preview/save/verify, invalid body/JSON/identifier/method, approval and stale-review errors, configuration absence, retained failed records, no-overwrite conflict, idempotence and full server restart.
- `tests/KnowledgePanel.test.tsx`: manual/source selection, no auto-export, approval gating, visible saved path, verification, remount, failed save/reapproval/retry, preview configuration error and initial API failure.
- Earlier migration tests now drop the new empty table when constructing legacy fixtures and expect schema version 7. Existing App mocks include the new read-only Knowledge list.
- `npm.cmd run build`: passed strict TypeScript + Vite production build (46 modules). No dependency/lockfile changes.
- `git diff --check`: passed. Git's Windows LF/CRLF informational notices are not whitespace errors.

## Real browser and vault evidence — 2026-09-17 local time

Executed normal `npm.cmd run dev` on `http://127.0.0.1:5173/`, using ignored local configuration and default ignored `var/studio.sqlite`. An initial occupied-port attempt was discarded; the verification ran on a fresh current-code process and then a full stopped/restarted process.

- Browser single-Agent invocation returned visible `MOCK · TEST OUTPUT`. `/api/agents/invocation-targets` returned GPT and Gemini with explicit `mock` / `mock-basic` metadata.
- Created isolated Workspace **Stage 10 knowledge verification**, ID `f212f4b9-69f2-46a2-8f12-8a370209443e`.
- Created Task `74d77299-0f12-4e1f-96ae-bc84a212d517`, then completed linked two-Agent Execution `8f83463e-4cd8-405f-8465-d72119bf1872`. The Task stayed Draft; no Knowledge action changed Task or Execution state.
- Preserved step-1 GPT output as Artifact `96d5143c-217c-4796-b9ed-330daff107db` with title **Stage 10 disposable smoke Knowledge**. Generated report `7f65abe0-017c-41ac-a8ff-b11ceb93df53` with one Execution and one Artifact.
- Prepared Artifact-backed Knowledge `c176be7e-b627-4f10-822e-15b9fac1a4a4`. Browser displayed content, provenance, root, path, Markdown and disabled Save. The generated destination directory did **not exist** before approval/save.
- Explicit approval + Save created exactly one note. Browser and API returned `saved`, confirmed `savedAt = 2026-09-16T23:04:20.968Z` (2026-09-17 locally), and Verify confirmed exact bytes. Read the actual Markdown and confirmed source/Task/Execution IDs and `UTF-8 check: 知识。` content.
- Task Report candidate `c9089e4d-1e20-4766-a920-5e6675e00c97` and manual candidate `883cdbc0-7eaa-4d7f-9964-3c1b5daaec79` remained **candidate**, with no additional external files.
- Browser reload and full runtime stop/start preserved all three Knowledge records and the source outcome chain. Reopened the same saved record and Verify succeeded again. Browser warning/error log was empty. Native keyboard approval/save was used after pointer automation missed controls in the narrow app pane; the visible saved/path/verify state was also screenshot-inspected.
- Before/after SHA-256 comparison: **91 pre-existing Markdown notes unchanged; 92 after; exactly one new note**. No canonical architecture note was altered. The temporary test note is intentionally retained for review, not silently deleted.

Configured real development vault (local context only):
`C:\Users\HAN HAO DING\Documents\HAN-KNOWLEDGE-PROTOTYPE`

Exact disposable note relative path:
`Knowledge/AI-Studio-Generated/knowledge-stage-10-disposable-smoke-knowledge-c176be7e-b627-4f10-822e-15b9fac1a4a4.md`

Smoke note SHA-256: `ED56C41B815C66C32E51615A6330FB039E5355BE8E5FBE100C74A4888D27ABF7`.

The real path exists only in local configuration and this verification record, never in core logic or tracked executable configuration. `.env.local`, runtime database/sidecars and build output remain ignored and are excluded from the commit. No secrets were added.

## Architect review points / known limits

- Confirm first-class immutable snapshots and explicit candidate → approval → pending → saved/failed lifecycle are the intended minimum Knowledge model.
- Confirm dedicated `Knowledge/AI-Studio-Generated`, UUID-suffixed names, separate-candidate duplication and byte-identical same-record retries; no overwrite/update/delete is offered.
- Review the intentional SQL/filesystem gap: pending intent precedes writes; explicit retry recognizes an identical file. No distributed transaction or automatic recovery is claimed.
- Frontmatter records the immutable first approval/save-attempt timestamp; SQLite/UI record the confirmed completion timestamp. Preview text discloses this timestamp transition.
- Hard-link-based publication was verified on the real Windows vault; other filesystems must support the primitive. Abrupt failure may leave `.pending-*` debris or a link pair requiring manual inspection. No automatic cleanup or backup system is introduced.
- Filesystem checks reject traversal, unsafe roots, junctions, symbolic links and hard-link aliases, but are not an adversarial concurrent-process sandbox. Trusted local single-owner runtime only; no remote deployment, authentication, authorization, secrets or audit engine is claimed.
- No content editing, sync/watch, conflict resolution, import/search, Memory/RAG/embeddings, automatic extraction/export, cloud/Obsidian plugin, final UX redesign, provider expansion or Stage 11+ work.

STOP for Architect review and HAN acceptance after the single local Stage 10 commit. Do not push or advance stages.
