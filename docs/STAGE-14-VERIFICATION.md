# Phase 9 Stage 14 — Prototype 0 Release Candidate Verification

## Status and baseline

- Builder complete; awaiting ChatGPT Architect review and HAN hands-on acceptance. **NOT PUSHED. NOT SEALED. Post-Prototype-0 work NOT STARTED.**
- Baseline: `9e29cfbc674637defd9c2d280cb2df80c09620b0` — sealed Stage 13, initially synchronized local `main` and `origin/main`.
- One final local commit: `Complete Phase 9 Stage 14 Prototype 0 release candidate`. Its exact hash is `git rev-parse HEAD` after that commit; the parent must be the baseline above.
- Scope follows HAN's explicit Stage 14 messages: whole-system acceptance, truthful UX, Normal versus Advanced/Inspect, disconnected navigation/Continue Active Work/placeholders, fewer normal-path decisions, preserved sealed contracts. A separate ChatGPT Stage 14 Architect handoff file was not available in the repository or supplied attachments; no additional unseen requirements are claimed.
- Continuation preserved the existing Stage 14 changes and acceptance data. No reset, Stage 13 redo, backend redesign or unrelated feature was undertaken.

## Release-candidate decisions

| Surface | Normal path | Advanced / Inspect or removal |
| --- | --- | --- |
| Home | Persisted Workspace create/open/archive/restore and explicit Mock-only notice | Registry, single-Agent Message/Invoke and standalone collaboration remain under Advanced, explicitly transient |
| Disconnected shell | Only working Home navigation and Workspace entry | Remove disabled future nav/profile placeholder, inert global intent, unbacked Attention/Continue Active Work claims and Projects/Assets/History rooms |
| Workspace / Task | Names, goals, planning states and real human lifecycle controls | IDs/source Chat and technical Workspace metadata in Inspect; remove stale “execution is not connected” copy |
| New Execution | Optional Task, bounded goal, actual readable default setup, explicit Create then Start | Mode/participants/pause policy in Advanced; defaults remain GPT → Gemini, Sequential, pause between steps |
| Execution history | Goal/status, progress, contributions, Mock labels, pending controls, terminal/failure state, telemetry-uncertainty warning | UUID/checkpoint/runtime/timestamps and full contribution provenance in Inspect; Context & Usage remains available |
| Artifact / report | Deliberate preservation, human source labels, output, kind/Mock identity, deterministic report summary/goal/limitations | Optional kind and technical provenance/report details in Advanced/Inspect |
| Knowledge | Exact candidate content, source type/status, vault/path, authority denial/review, fresh approval, Save/retry/Verify and failures | Technical identity/provenance and audit/Secret-reference inspection remain collapsed |

This is native progressive disclosure, not a new domain mode, permission switch, global activity model or design system. Source/report content is not rewritten to remove embedded IDs: full reviewed bytes remain authoritative. A selected Task goal prefills only an empty draft and only when the entire goal fits 500 characters; it never truncates the Task or overwrites a human draft.

A review-state timing issue found during cleanup was fixed narrowly: selection/record merges clear old preview, approval and verification presentation immediately. A visible loading status precedes fresh preview controls. Tests wait for current enabled controls rather than clicking a stale button. Server freshness, one-use approval and all security enforcement are unchanged.

Keyboard Skip to content and focus-visible disclosure styling were added. Long labels/paths wrap, the outcome grid can shrink below its former 18rem minimum, and sidebar sizing no longer follows the entire tall page. Mobile approval and Save are separated visually.

## Whole-system acceptance matrix

| Existing stages / concern | Evidence and outcome |
| --- | --- |
| 0–2 shell, startup, Workspace and persistence | Baseline/RC full suites; normal development and built production start; real create/open/reopen; persisted identity; existing archive/restore regressions retained |
| 3–4 Chat, Message, Task | Browser created/renamed a Chat, sent a human message with Enter and made a Chat-linked Task; all survived production restart; Task stayed Draft independently of completed Execution; Active/Closed/lifecycle tests pass |
| 5–7 identity, adapters, orchestration | Relocated Message form produced MOCK TEST OUTPUT; standalone GPT → Gemini collaboration succeeded; registry still says unavailable for real providers; API/error/provider validation regressions pass |
| 8 Execution and human controls | Browser default Create → explicit Start → Paused 1/2 → refresh/reopen → full process restart → Resume → Completed 2/2; terminal controls and failure/cancel/interrupt cases remain green |
| 9 outcomes | Browser deliberately preserved Gemini output, generated deterministic report; report truthfully showed Task Draft, one completed Execution and one Artifact; provenance and lost-response UUID retry tests pass |
| 10 Knowledge / Obsidian | Browser reviewed exact content/destination, approved one attempt, saved one synthetic note and byte-verified it; a report-derived candidate stayed unsaved |
| 11 permissions / approval / audit | One approval and started/succeeded audit pair; normal Save disabled without approval; explicit deny configuration visibly disabled approval/Save; origin/CSRF/scope/no-overwrite/failure regressions pass |
| 12 context / telemetry | Browser inspected original two invocation/context identities, four durable events, synthetic-not-billing usage, unknown cost, bounded supplied text and excluded Chat/Knowledge/vault/Secrets/Audit; finalization uncertainty remains visible in Normal |
| 13 recovery / idempotency | Existing HTTP/SQLite integration and failure tests pass; actual refresh/restart/Verify retained equal table/note hashes, no extra contributions/Artifacts/Knowledge/approvals/audits/telemetry |
| Normal versus Inspect | Tests check hidden-yet-reachable controls and IDs without hiding content, status, failures, authority or destination; keyboard disclosure and skip link exercised in real browser |
| Failure truthfulness | Real stopped-server Refresh reported “Knowledge could not be loaded. Refresh to retry.” plus retained candidate/preview error; no success fabricated |
| Explicit configuration | Production restart with provider `none` returned `{"targets":[]}`; invocation/collaboration explained absence, new Execution disabled, historical work inspectable; publication `deny` visible without modifying saved data |

## Automated verification

Environment: Windows PowerShell; Node `v24.21.0`, npm `11.19.0`. No dependency or lockfile changes.

- Before implementation: `npm.cmd test` — **229/229 tests, 39/39 files**.
- Focused presentation run: `npm.cmd test -- tests/App.test.tsx tests/ExecutionPanel.test.tsx tests/OutcomePanel.test.tsx tests/KnowledgePanel.test.tsx` — **33/33**, before the final delayed-preview case.
- Final delayed-preview check: `npm.cmd test -- tests/KnowledgePanel.test.tsx` — **10/10**.
- Final full `npm.cmd test` — **236/236, 39/39 files**, 2026-09-21 21:16:52 Asia/Kuala_Lumpur; no React act warnings or unhandled errors.
- Seven new cases cover advanced/default setup, safe Task-goal prefill, normal telemetry uncertainty, intentional backend-none, optional Artifact kind/provenance, normal review safety and delayed fresh-preview synchronization. Existing baseline behavior tests remain, adapted only to changed presentation.
- `npm.cmd run build` — **PASS**, strict TypeScript and Vite production build, 48 modules. Final output: CSS 29.09 kB (gzip 6.56), JS 291.02 kB (gzip 85.02). The final production UI was exercised in-browser.
- `git diff --check` — **PASS**; final staged scope inspected before commit. Standard local LF/CRLF notices are not whitespace errors.
- SQLite read-only integrity check — **ok**; foreign-key check — **no violations**.
- No runtime DB/sidecar, note, environment value/secret, generated dist, dependency, migration or backend/core change is included.

One full attempt after adding the final test failed during worker startup: Windows returned `UNKNOWN` reading jsdom's `CustomElementRegistry-impl.js`; 233 tests in 38 files ran, but that run was **not counted as success**. Direct read (8,467 bytes) and jsdom import succeeded; the unchanged full rerun above passed all 236. No warning suppression, dependency change or skipped test was used. This resembles the separately documented Stage 13 environmental worker-read intermittency; its OS cause is not established.

## Controlled real-browser procedure and evidence

Date: **2026-09-21, Asia/Kuala_Lumpur**, across the afternoon verification and evening continuation. Browser automation used the computer-use skill to exercise the actual application, not mocked DOM data. Synthetic data only.

Owned instance: loopback `http://127.0.0.1:5175`; process-only configuration:

- `HAN_AI_STUDIO_PORT=5175`
- `HAN_AI_STUDIO_DATA_DIR=<repo>/var/stage14-browser/data`
- `HAN_AI_STUDIO_OBSIDIAN_VAULT=<repo>/var/stage14-browser/vault` (isolated existing directory with `.obsidian`)
- `HAN_AI_STUDIO_PROVIDER_MODE=mock`
- `HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION=review`

No `.env.local` edit and no real-vault access. Normal `npm.cmd run dev` created the durable flow; after stopping that process, `npm.cmd start` on the same data/vault served the built release candidate.

1. Home showed only useful navigation, real Workspace entry, explicit Mock limitations and collapsed test tools. Keyboard Skip to content focused main.
2. Expanded Advanced; entered “Stage 14 RC explicit test message”; visibly received MOCK TEST OUTPUT. Ran transient two-Agent collaboration with attributed contributions. Returned to normal flow.
3. Created **Stage 14 RC acceptance**, a Chat named **Stage 14 acceptance conversation**, one human-authored message and linked Task **Stage 14 release candidate proof**.
4. Selected the Task in Execution setup. Its full short goal filled the empty draft, visible defaults were correct, no optional setup choice was necessary. Create yielded Created with zero steps; Start paused after GPT, 1/2.
5. Browser refresh/reopen retained Paused. Full dev stop → production start retained Paused. Resume completed only Gemini, 2/2. Task remained Draft. Original usage/context records were inspectable.
6. Refresh Outcomes → preserve Gemini as **Stage 14 RC smoke artifact** → generate report. Refresh Knowledge → prepare Artifact → review exact content/path → check approval → Save → Verify matched bytes. Advanced showed one approval-bound started/succeeded audit pair and unavailable Secret references.
7. Prepared a report-derived Knowledge candidate but did not approve or save it. Switching records required fresh review; content and exact destination remained outside Inspect.
8. At 1280px and 390px, DOM width checks found no horizontal page overflow (scroll widths 1265/375 with scrollbars). Visually inspected mobile review, wrapped full vault/note paths and separated approval/Save controls. Keyboard Inspect disclosure operated with Enter. This is scoped evidence, not a universal accessibility/browser certification.
9. A later full production stop/start and fresh browser reopen preserved completed output, Task/source Chat identity, original human message, report, both Knowledge records and original telemetry. Read-only Verify matched the same note again.
10. Deliberately stopped the owned server; Refresh Knowledge visibly reported fetch failure and retained candidate content. Restarted with `none` and `deny`: API returned zero targets, UI clearly explained unavailable execution, preserved completed output and denied publication with controls disabled. No publication request was made under denial.
11. Compared read-only table/note hashes before production restart and after subsequent read-only browser verification/configuration checks: all identical. Healthy browser checks had empty warning/error logs; deliberate outage caused expected failed-fetch network errors, not React warnings.
12. Owned test servers stopped and temporary viewport overrides reset. The user’s normal application server/configuration/data was not changed. Browser test data and one note remain ignored for review.

### Retained identities

| Object | ID |
| --- | --- |
| Workspace | `f4595b37-6f41-4886-8be5-9c4b05594d7e` |
| Chat | `5a7c1651-8748-4786-8b11-557ccf662b24` |
| Task (Draft) | `b2e95440-7950-4e72-aad6-c541e0b7fefa` |
| Execution (Completed, 2/2) | `6b74e20c-fc7e-451b-bdf4-6558d784e97a` |
| Artifact | `5c609418-2866-4065-bb5c-8a476c606885` |
| Task Report | `274f5391-c7fe-476b-ac3e-aa5e8f41946b` |
| Saved Artifact Knowledge | `8cdb03d1-0e6a-467c-b52a-c82ec375839c` |
| Unsaved Report Knowledge | `1ce1b6e8-0597-48e8-9a0f-4458afb35ab4` |
| Consumed approval | `9659a862-1a7d-465e-82c3-fe2aaf50f76b` |
| Publication attempt | `76072511-53b5-476e-b461-b0502b24b3bf` |
| GPT invocation / context | `dc9b3091-6e68-445e-b4aa-b1ef16075372` / `34e6ccad-3a87-4bf7-b634-cc8922e792aa` |
| Gemini invocation / context | `04000523-9d61-4f6b-a261-216d98a37ce0` / `f92d5b82-763f-4c79-8d8c-28fd58e7509b` |

### Restart equality

Read-only Node `DatabaseSync` queries serialize all rows ordered by `rowid`; SHA-256 is over JSON row content, not changing SQLite/WAL container bytes. These 13 tables include report reference tables as well as durable Chat/message records. No data was changed by these checks.

| Table | Rows | SHA-256 before = after |
| --- | ---: | --- |
| workspaces | 1 | `9310afa00e3b04c75822c00a71d2d8a2c8d86c2992855362ba1b6d31c8a03573` |
| chats | 1 | `0f4b89a1045717a9cccc1d3a24f8aaf3893c6c4d6e4e754bf6f503f09e0e78cb` |
| messages | 1 | `6c485ebe60bb54389057b5349e892df35eb62e61100d7a5e4453babfdd064e44` |
| tasks | 1 | `b98fc8dade7df46ab40650c0f1aa046cf49a13549df8cd803ab422941bf06202` |
| executions | 1 | `77f940b8b63025f72fa3339e0eb36c1ce439fb7a851fc250f4dfbfb080e7adba` |
| artifacts | 1 | `720cc95da09f6de7aad39f36d6dba62ba2d1e142ef3adb94dbce2c7209dc3c5b` |
| task_reports | 1 | `896fea10d087a3f0152ad7643c0df57794c6d50242feb8dffc74e0fd5ac7ef8a` |
| task_report_executions | 1 | `b51686cff1550c1a98600bd6399ebd8a4436311824a9d5df8ae753feb20e905b` |
| task_report_artifacts | 1 | `7263a60cc3ac5371854999119e22a76dfb40cc7756dcfb33915c5fa49d970d44` |
| knowledge | 2 | `1e59aba94b5ffb66bdf10d838f1ba2c8352a64ab4485e87d10e2152bb72ce11f` |
| authority_approvals | 1 | `7d907ba311e8b315a4e30644163d46b8f5b35e206a70905ede09b89c752ef257` |
| audit_events | 2 | `75f91fb5749173a9fc95e6d7056bb7144e8307257d75ab9003520f735f8d9f79` |
| invocation_telemetry | 4 | `38a0377f0e94dd98b806416cba313ae605b03b30afd3f54ef0b04313369c49a2` |

Exactly **one Stage 14 browser smoke Markdown note** was created:

```text
C:\Users\HAN HAO DING\Documents\Codex\Codex Project\HAN-AI-STUDIO\var\stage14-browser\vault\Knowledge\AI-Studio-Generated\knowledge-stage-14-rc-smoke-artifact-8cdb03d1-0e6a-467c-b52a-c82ec375839c.md
```

SHA-256 before/after: `645d5781dc3aec0bd4bf1d71faac350238b8063372da554c8c87362c0e89ca37`. The report candidate's preview path is not a created file. No real Obsidian notes were accessed or modified. Automated suites use their separate disposable fixture vaults, cleaned by teardown. Retained browser data is `var/stage14-browser/data/studio.sqlite`; all `var/stage14-browser/` content is ignored and excluded from the commit.

## Material files and unchanged boundaries

- UI/style: `App.tsx`, `WorkspaceSection.tsx`, `WorkspaceView.tsx`, `TaskPanel.tsx`, `ExecutionPanel.tsx`, `OutcomePanel.tsx`, `KnowledgePanel.tsx`, `styles.css`.
- Regression tests: `App.test.tsx`, `ExecutionPanel.test.tsx`, `OutcomePanel.test.tsx`, `KnowledgePanel.test.tsx`.
- Documentation: `README.md`, `BUILD-PLAN.md`, `BUILD-STATE.md`, `docs/ARCHITECTURE.md`, this verification record.
- Unchanged: core/domain/application/server/storage/connectors/providers; all migrations, package files, configuration contracts, security grants, lifecycle/recovery and Stage 13 retry identities.

## Limits and review gate

- Mock-only routing/echo demonstrates bounded execution and provenance, not intelligence or real-provider connectivity. No real AI replies, Ponytail, Jev, engine integration, Builder Harness modification or post-Prototype-0 feature.
- Manual Refresh remains between independent panels. No global Continue Active Work aggregate is invented. Long histories/page length are not comprehensively redesigned. Current page, drafts, approval and Home transient results are not persisted.
- Task planning remains independent; reports are explicit deterministic snapshots. Outcome/Knowledge preparation is deliberate. New intent IDs may create new records; per-intent retry protection is not global deduplication.
- Pausing occurs between steps, not inside provider calls. Interrupted/Failed/Cancelled/Completed remain terminal. Uncertain in-flight calls are never replayed. Checkpoints, telemetry, publication and final audit are not a single transaction.
- Required authority/evidence still fails closed. Unknown usage/cost remains unknown; Mock counts remain synthetic. UI disclosures are not access control. Local-owner loopback assumptions and one-server-per-database limits remain.
- No clean-machine install, new dependency/security audit, multi-browser accessibility certification, backup/restore product, desktop package, release tag or public distribution was performed or claimed.
- No known application blocker or major sealed-contract architecture conflict was found. Environmental test-worker intermittency and unavailable separate handoff text are disclosed above. HAN/Architect acceptance remains pending.

**STOP after the single local Stage 14 commit. Do not push, seal, or begin post-Prototype-0 work.**
