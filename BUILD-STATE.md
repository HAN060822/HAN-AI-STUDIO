# HAN's AI STUDIO â€” Build State

- **Current Version:** 0.0.0
- **Current Stage:** Stage 14 â€” Prototype 0 Release Candidate
- **Stage Status:** Builder complete â€” regression, build and controlled real-browser acceptance/recovery verification passed; awaiting Architect review and HAN acceptance; NOT PUSHED; NOT SEALED
- **Latest Completed Stage:** Stage 14 (builder complete); Stages 0â€“13 are accepted, PUSHED and SEALED per HAN's Stage 14 authorization.
- **Latest Git Commit:** `HEAD` â€” single local `Complete Phase 9 Stage 14 Prototype 0 release candidate` commit; obtain its exact self-referential hash with `git rev-parse HEAD`.
- **Baseline Commit:** `9e29cfbc674637defd9c2d280cb2df80c09620b0` â€” `Complete Phase 9 Stage 13 end-to-end integration and recovery`; synchronized `main` / `origin/main` before Stage 14. Continuation preserved all existing Stage 14 work and finished only remaining verification, documentation and commit.
- **Working Branch:** `main`
- **Planned Engine Direction (not implemented):** The earlier LibreChat Hybrid Engine proposal remains deferred planning. Stage 14 accepts and cleans up the existing Prototype 0 path only. No engine adoption/rejection decision, Ponytail, Jev or Builder Harness change is included; post-Prototype-0 work is NOT STARTED.

## What Works

- Responsive AI World Lobby and Stage 1 shell continue to render locally.
- Workspaces are created, listed, retrieved, opened, edited/renamed, closed, archived, restored, and reopened through a typed application service.
- Workspace UUID identity remains stable across rename and lifecycle changes; duplicate names are allowed.
- Workspace records persist across browser refresh and local runtime restart in SQLite at `var/studio.sqlite` by default.
- Archived Workspaces remain stored, are excluded from normal active listing, and can be viewed and restored from Home.
- Workspaces now own durable Chats: users can create, list, reopen, rename, and return from chats without affecting workspace identity or lifecycle.
- Chats own ordered, human-authored Messages. The workspace, chat, and message views remain distinct; message role types also reserve `agent` and `system` for later stages.
- Chat and message data persist in the same local SQLite database through a workspace-scoped same-origin API and survive browser reload and local runtime restart.
- The Chat UI has an honest empty state, accessible title rename, message history, and a composer that sends on Enter and permits a newline with Shift+Enter. Failed writes retain the draft and surface an error.
- Workspaces now own durable Tasks with stable IDs, required titles/goals, planning status, timestamps, and optional same-Workspace source Chat references.
- Workspace Task UI supports create, list, open, rename, goal editing, validated state transitions, leave/return, refresh, and runtime restart persistence.
- Task collections default to compact, bounded Active views (`draft`, `discussing`, `paused`, and `blocked`); persisted Completed and Cancelled Tasks move to a separate Closed view without losing identity or history.
- Chat UI exposes related Tasks and can create a Task linked to the current Chat while preserving the distinction between discussion and work.
- A global, configuration-backed Agent Registry exposes the stable GPT, Gemini, and Codex AI Studio identities, machine-readable capability metadata, honest availability, and inspectable provider bindings.
- The Home AI Team renders from the Agent Registry and reports providers as not connected; the former simulated Working/Waiting presentation is removed.
- A Provider Adapter contract, normalized request/response types, and descriptor/adapter resolver establish the Stage 6 boundary without making provider calls.
- A server-side Agent invocation service resolves `agent-gpt` and `agent-gemini` through explicit Mock test bindings and one executable deterministic Mock adapter, returning normalized Agent/Provider/Model/mode/status metadata without changing production availability.
- Home includes a small Prototype test invocation surface whose results are unmistakably marked `MOCK Â· TEST OUTPUT`; it does not mutate Chat, Task, or Agent production availability.
- Disconnected Projects/Assets/History rooms, disabled future navigation, inert global intent, false Attention and Continue Active Work placeholders are removed. Home leads to the real persisted Workspace list; no fake aggregate activity state is introduced.
- Persistence and validation failures surface without pretending a write succeeded.
- A deterministic Orchestrator coordinates only explicitly selected Agent identities through `AgentInvocationService`, with bounded ordered plans and an injectable future planning seam.
- Sequential collaboration supports one to three distinct selected Agents; Review / Challenge supports a primary contributor and one explicit reviewer. The normal Prototype config exposes GPT and Gemini, not Codex, as Mock test participants.
- Structured handoffs carry source/target identity, original goal, an at-most-800-character prior-contribution excerpt with truncation metadata, and the next action; they never automatically access Chat history.
- Home's dedicated Prototype Collaboration surface displays ordered, attributed contributions and final output with clear Mock/test labels. Honest preflight/step failures preserve earlier contributions without substitution or fallback.
- Workspace-scoped Executions now persist as distinct runtime attempts, optionally linked to a same-Workspace Task without changing Task planning state.
- A validated lifecycle supports Created, Running, Paused, Cancelled, Interrupted, Failed and Completed, with terminal states closed to further work.
- Human Start/Pause/Resume/Cancel controls operate at real safe boundaries; in-flight controls remain visibly pending until the current call settles. Completed contributions are retained after cancellation/failure.
- Versioned atomic SQLite checkpoints retain the immutable bounded plan, next index, in-flight marker, contribution provenance, control intent, failure and timestamps. Paused attempts resume after full restart without repeating completed steps.
- Startup recovery marks previously Running attempts Interrupted without replaying uncertain provider calls. Home's Stage 6 and Stage 7 surfaces remain independent and functional.
- Workspace-scoped Artifacts now persist as deliberate formal outcomes, with optional Task ownership and immutable copied Execution contribution content plus Agent/Provider/Model/backend provenance.
- One stable current Task Report per Task is explicitly generated or regenerated from observable stored Task, Execution, failure, Agent and Artifact state; it never claims AI-authored synthesis.
- The separate outcome UI preserves selected contributions, displays provenance, generates reports, and reconstructs both after browser reload and full server restart.
- Workspace-scoped Knowledge candidates snapshot selected Artifact/Task Report content and provenance or manual text without altering sources or exporting automatically.
- Review shows the Markdown, configured vault, and exact path; explicit approval is required for Save. The narrow Obsidian connector creates UTF-8 notes only in `Knowledge/AI-Studio-Generated` with safe UUID-suffixed filenames and no overwrite.
- Candidate/pending/failed/saved state, bound destination, failure, optimistic revision and timestamps persist in SQLite. Explicit retry handles an identical already-published note without duplication; saved-note Verify is read-only.
- Browser refresh and full normal development runtime restart preserved saved Knowledge and unsaved candidates. One authorized real-vault smoke note was created; all 91 pre-existing note hashes remained unchanged.
- Stage 11 adds explicit actor/action/resource/scope permission decisions, default denial, bounded one-use human approvals and persistent safe Audit events around Knowledge publication.
- Existing content/destination review also authorizes exactly one consequential attempt. Durable consumed approval and start audit are committed before the existing connector can run; success, failure and uncertainty are reported honestly.
- Loopback/Host/Origin/Fetch-Metadata checks and a fresh process-local Save token establish the documented local-owner surface; client-supplied actor/approval injection is rejected. This is not authentication against local processes.
- Environment-backed Secret references expose server-only synchronous consumption and safe status. Dummy tests prove governed use/failure; production policy grants no secret use and connects no real provider.
- Collapsed Advanced Knowledge details show recent scoped audits and safe Secret statuses. Denied and approval-required states remain visible in the normal review flow.
- Stage 12 formalizes the existing explicit goal/action/immediate handoff as a bounded Context Package, with metadata-only source/reason/size/truncation/omission provenance and reference-only Workspace/Task/Execution scope.
- Actual Mock-backed Executions receive per-invocation/context identities, normalized explicitly synthetic usage, monotonic adapter timing and append-oriented SQLite telemetry. Unknown provider usage/cost remains unknown; no Chat/Knowledge/vault/Secret/Audit retrieval is added.
- Collapsed Execution **Advanced: Context & Usage** lazily inspects Agent/Provider/Model, result, usage, duration and context metadata with visible fetch errors/retry and unconfirmed-final states. Exact telemetry survives reload/full server restart without replay or historical backfill.
- Stage 13 real HTTP/SQLite integration covers Chat-linked Task â†’ two-Agent Execution â†’ formal Artifact/Task Report â†’ reviewed Knowledge â†’ permission/approval/audit â†’ Obsidian â†’ read-only verification â†’ full server restart. Task planning state remains independent, and Chat text is not silently included in provider context.
- Artifact preservation retains a caller UUID for an unchanged in-panel retry after an uncertain response. Exact retries return the same immutable Artifact; conflicting reuse returns 409. Refresh merges by identity and never automatically resubmits.
- Re-saving already-saved Knowledge still requires fresh reviewed authority, but audits read-only confirmation as `not_executed / already_saved_verified`, not another publication success. Original unmatched audit/telemetry starts are never rewritten or backfilled.
- Execution reads and startup recovery validate checkpoint consistency before presenting/using it. Invalid state fails explicitly without invented repair; failed startup recovery releases the HTTP listener and repositories.
- Development Vite updates share that instance's HTTP listener instead of contending for a separate global HMR port. Normal `npm.cmd run dev` was verified through two full stop/start cycles using isolated Stage 13 data/vault overrides.
- Stage 14 separates Normal work from collapsed Advanced/Inspect details. Actual state, controls, failures/uncertainty, Mock labels, output, exact publication destination and approval/Verify remain visible. IDs, provenance, checkpoint details, optional setup and transient Home test tools remain reachable without new backend/domain modes.
- Short Task goals prefill empty Execution drafts without truncating longer goals, overwriting human input or starting work. Knowledge record changes remove old preview/approval/verification controls immediately while fresh review loads. Sealed server authority and retry behavior are unchanged.
- Keyboard skip/focus affordances and narrow-panel wrapping/grid fixes pass actual desktop and 390px browser checks. One real Chat-linked Task completed the existing Mock â†’ Artifact/report â†’ Knowledge â†’ approval/audit â†’ isolated Obsidian â†’ Verify loop across development and production restarts.

## Incomplete Work

- Real provider/engine integration and broad governance of other capabilities remain deferred. Post-Prototype-0 work is NOT STARTED. Stage 11 does not retrofit all internal/Mock actions; Stage 12 telemetry grants no authority. Architect review and HAN acceptance of this release candidate remain pending.
- Real AI-generated Chat replies, real-provider inference, Task Agent assignment, message deletion, chat archive/delete, and cross-workspace move/copy are intentionally not implemented.
- Parallel collaboration, intelligent planning/convergence, standalone collaboration history, and final multi-Agent Chat UX are deferred. Mock echo output proves routing/context/provenance, not intelligence or semantic agreement.
- Collaboration goal limit is 500 characters; previous contribution handoff limit is 800 characters and truncation may omit trailing context. Standalone Stage 7 results remain transient; contributions inside Stage 8 Executions are durable.
- No mid-provider-call suspension/abort, automatic replay, uncertain-call recovery, provider timeout, scheduler, cloud/external/physical runtime, or multi-process runtime ownership is implemented. Use one server per database.
- Abrupt termination or a failed checkpoint write may lose an uncommitted in-flight output. Recovery preserves the last committed application checkpoint, not provider hidden state; Interrupted is terminal.
- Artifacts are text-only and immutable in Prototype 0; edit/delete, binary/file storage, automatic preservation, report version history, intelligent synthesis, and automatic report refresh are deferred.
- Knowledge content is immutable in Prototype 0. No edit/delete, conflict resolution, background retry, bidirectional sync, bulk export, import/search, Memory Engine, RAG/embeddings/vector/graph DB, cloud sync, Obsidian plugin, backup system, or final UI redesign is implemented.
- SQLite confirmation, final audit and external note publication are not one transaction. A failed final database write leaves a retryable pending intent; final audit failure is explicitly unconfirmed. A start event without its final event requires inspection, never automatic replay. Abrupt crashes can leave an owned temporary file/link pair requiring inspection. Publication requires hard-link support; path checks do not protect against hostile concurrent directory replacement.
- Prototype policy is code/config-backed; revocation requires restart. No IAM, login, policy dashboard, OS secret vault, cryptographic audit ledger, retention/rotation or multi-process ownership exists. Audit guards application history, not against a database owner removing triggers. Secret consumers are trusted synchronous server code; an asynchronous real adapter needs a separately reviewed contract.
- Stage 12 persists telemetry for Workspace Executions only; standalone Home invocation/collaboration measurements remain transient. Metadata fingerprints are equality evidence, not anonymization. Context isolation is not a DLP filter for explicit user text. No tokenizer, automatic context optimizer, billing/pricing, model router, RAG, cloud analytics or event warehouse is implemented.
- Telemetry finalization and Execution checkpoints are not one transaction. Unmatched starts remain in-flight/unconfirmed; a committed final event may outlive an uncommitted contribution after a crash. Existing Interrupted/no-replay policy remains authoritative; no automatic reconciliation or retry is added.
- Artifact creation IDs protect one explicit retry intent, not global content deduplication. Legacy callers omitting the optional ID keep deliberate-create behavior. The pending form/ID is transient across a full page reload; inspect fetched saved outcomes before starting a new preservation intent. No offline queue or automatic replay is added.
- Stage 13 checkpoint validation is not general database salvage, migration backup or hardware/power-loss recovery. Automated abrupt-stop testing injects the durable in-flight checkpoint shape into a disposable fixture; browser testing actually restarts the dev process at safe boundaries. Open selections, drafts, unchecked approval and standalone Home results remain transient. Independent engineering panels retain explicit Refresh controls.

## Known Errors

- No known Stage 14 application test/build failure or sealed-contract architecture conflict. A final-suite attempt hit a Windows `UNKNOWN` read error loading a jsdom worker dependency before that file's tests ran (233 tests in 38 files ran). Direct reading/loading succeeded and the unchanged full rerun passed 236/236 in 39 files without errors or act warnings; no dependency/configuration change or suppression was used. This environmental intermittency is recorded, not counted as a passing run.
- Independent panels retain explicit Refresh controls; selection/drafts/approval are transient. Responsive checks cover the acceptance data at 1280px and 390px, not comprehensive browser/device/accessibility certification. The separately referenced ChatGPT Architect handoff was not supplied as a Stage 14 file; the explicit Stage 14 scope in HAN's messages is the implemented acceptance scope.
- Historical Stage 11 observation: read-only real-vault inspection found the Stage 10 smoke note absent while its local Knowledge record remained saved. Stage 12 did not read or modify that vault, recreate the note, or infer who removed it.

## Tests Status

- `npm.cmd test`: passed (39 test files, 236 tests) on the final unchanged run, with no React `act(...)` warnings or unhandled errors. All 229 baseline Stage 0â€“13 cases remain green, with presentation assertions adapted where controls moved; 7 new Stage 14 cases protect setup/defaults, bounded prefill, visible telemetry uncertainty, configured-none behavior, optional Artifact controls, normal approval visibility and delayed fresh-preview synchronization. Automated writes use temporary databases/vaults only.
- Stage 14 focused UI run: 33 tests in 4 files passed; after adding delayed-preview coverage, all 10 KnowledgePanel tests passed independently. Final full suite includes all changes.
- Stage 14 real-browser acceptance (2026-09-21, Asia/Kuala_Lumpur): `npm.cmd run dev` then `npm.cmd start`, loopback 5175 with isolated Stage 14 data/vault. Home/advanced tools, Chat/message/linked Task, default Execution Create/Start/pause, refresh, full restart/Resume, Artifact/report, candidate review/approval/Save/Verify, unsaved Report candidate, Inspect telemetry/governance and 390px/keyboard checks passed. Further full production restart/reopen/Verify preserved all 13 relevant table hashes and the one note hash; SQLite integrity/FK checks passed. Actual server-offline and `none`/`deny` states were visible and did not mutate history. Healthy browser checks had no warning/error logs; deliberate offline fetches produced expected network errors. Owned servers stopped. No real-vault notes accessed/modified. Exact evidence: `docs/STAGE-14-VERIFICATION.md`.
- Stage 13 focused run: 24 tests in 5 files passed (`serverIntegration`, `knowledgeRecovery`, `OutcomePanel`, `telemetry`, `executionPersistence`). Covers failure/uncertainty, fresh review, no-overwrite, retry identity, terminal-state rejection, invalid recovery and resource cleanup.
- `npm.cmd run build`: passed (strict browser/server TypeScript checks and Vite production bundle, 48 modules).
- Stage 13 real-browser smoke (2026-09-21, Asia/Kuala_Lumpur): normal `npm.cmd run dev` on loopback 5174, isolated `var/stage13-browser/data` and `vault`, Mock providers and reviewed publication. Task â†’ GPT pause â†’ browser refresh â†’ full restart â†’ Gemini Resume â†’ completed â†’ Artifact + Report â†’ Artifact Knowledge review/Save/Verify; Report candidate deliberately remains unsaved. Second full restart and browser reopen retained exact IDs and rows: 1 Workspace, 1 Task, 1 Execution/2 contributions, 1 Artifact, 1 Report, 2 Knowledge records, 1 consumed approval, 2 audits, 4 telemetry events/2 invocations. All nine table-content hashes and the single note hash remained identical; SQLite integrity/FK checks passed; browser warnings/errors empty. Exact note path and evidence: `docs/STAGE-13-VERIFICATION.md`. Owned smoke server was stopped; no real-vault notes were accessed or modified in Stage 13.
- Stage 12 controlled real-browser smoke: built production runtime `npm.cmd start` on 127.0.0.1:5174 with isolated data and publication denied. Created `Stage 12 Context Usage Smoke`, ran GPT â†’ Gemini through Start/Pause/Resume/Completed, inspected synthetic-not-billing usage, unknown cost and bounded metadata. Full server restart and fresh browser reopen retained the same two invocations/four events byte-for-byte; SQLite integrity/FK checks passed. Browser warning/error log empty. No Knowledge/Audit events or Obsidian note created. Evidence: `docs/STAGE-12-VERIFICATION.md`.
- Stage 11 real-browser smoke: normal `npm.cmd run dev` with isolated data/vault process overrides; denied policy visible, denied request 403 and no-approval request 409 created zero notes; explicit browser approval created exactly one temporary note; byte Verify, four audit events and one consumed approval survived full restart. Browser warning/error log empty; Mock invocation regression passed.
- Stage 11 real vault: read-only check of 105 Markdown files was hash-stable; historical Stage 10 disposable note is absent. No Stage 11 real-vault note created and no existing real-vault note changed. Temporary smoke data remains ignored in `var/stage11-browser/` for review.
- Exact `npm.cmd run dev`: combined local runtime and Vite server started on `127.0.0.1:5173` with Mock test backend; full stop/start and browser reload passed for durable Execution state.
- Real-browser Stage 7 smoke passed: production Agent identities/status, single-Agent invocation, Sequential GPT â†’ Gemini, Review / Challenge with visible handoff, attributed final `MOCK Â· TEST OUTPUT`, usable form and result layout.
- Workspace/Chat/human message/Task creation and Active/Closed separation passed in `Stage 7 smoke verification`. Browser refresh and full dev-server restart retained the human data; collaboration ran again after restart. Browser error/warning log was empty. Smoke data is only in ignored `var/studio.sqlite`; existing Workspaces were not modified.
- Stage 8 real-browser smoke passed in separate `Stage 8 runtime verification`: linked Task, Create/Start, safe-boundary pause with one contribution, Resume to completion, Cancel preserving output, refresh, and Review resume after full dev-server restart. Linked Task remained Draft. Single-Agent and standalone collaboration regressions passed. Browser error/warning log was empty.
- Stage 9 real-browser smoke passed in separate `Stage 9 outcome verification`: Task â†’ completed two-Agent Execution â†’ final contribution â†’ formal Artifact â†’ deterministic Task Report. Artifact/report identity, content, provenance and references survived browser reload and full dev-server restart. Browser error/warning log was empty.
- Stage 10 real-browser smoke passed in isolated `Stage 10 knowledge verification`: Task â†’ two-Agent Mock Execution â†’ Artifact â†’ reviewed Knowledge â†’ explicit Save â†’ real UTF-8 Markdown â†’ Verify. Task Report/manual candidates remained unsaved. Reload and full server restart retained identities, content, provenance and path; browser warning/error log was empty. Exact note path and evidence are in `docs/STAGE-10-VERIFICATION.md`.
- Real-vault before/after SHA-256 comparison: 91 existing notes unchanged, one clearly identifiable disposable Stage 10 note added in the dedicated generated destination; no canonical architecture notes modified.
- `git diff --check`: passed. Stage 14 changes only 8 UI/style files, 4 test files and 5 documentation files; no runtime database, secret, local env, generated build output, application/core/server/storage/connector, migration or dependency change. Ignored Stage 14 smoke data and its one disposable note remain local-only in `var/stage14-browser/` for review.
- Real API and 12-Task UI smoke verification passed for Workspace, Chat, Message, and Task data, including stable Task identity, active/closed classification, goal/state, and optional source Chat relation across refresh and runtime restart.
- `npm ci`: clean lockfile install completed during Stage 0; npm audit reported 0 vulnerabilities.

## Important Decisions

- TypeScript modular monolith with React/Vite and Node.js local runtime boundaries.
- Node 24 built-in `node:sqlite` is used behind `WorkspaceRepository`; mutable data defaults to ignored `var/studio.sqlite`.
- Providers use adapters; Obsidian and external systems use connectors.
- Desktop wrapper selection remains deliberately deferred; the SQLite implementation is now fixed to Node 24's built-in API behind the repository port.
- Stage 1's original simulated presence was replaced by honest registry-backed production availability in Stage 5; Mock calls never change that status.
- The browser calls same-origin local `/api/workspaces` and workspace-scoped conversation boundaries; it never opens SQLite or issues SQL.
- Numbered, transactional migrations are recorded in `schema_migrations`; non-destructive Migration 3 adds `tasks` with restrictive Workspace and optional Chat foreign keys and deterministic indexes.
- Open/close selection is transient UI navigation; the Workspace domain itself is durable. Archive is non-destructive and delete is not implemented.
- A Chat belongs to exactly one Workspace; a Message belongs to exactly one Chat. Database foreign keys use `ON DELETE RESTRICT`; no Stage 3 delete surface exists.
- Browser code calls only the same-origin conversation API. `ConversationService` owns validation, workspace-scope checks, UUIDs, timestamps, and human-message creation; `SqliteConversationRepository` owns SQL.
- Task is a separate domain and is not an Execution. `TaskService` owns validation, cross-Workspace protection, IDs, timestamps, and lifecycle transitions; `SqliteTaskRepository` owns Task SQL.
- The honest Stage 4 Task states are Draft, Discussing, Paused, Blocked, Completed, and Cancelled. Completed and Cancelled are terminal; no status implies runtime activity.
- **DATA RETENTION â‰  ACTIVE UI PRESENCE:** completed and cancelled Tasks remain authoritative SQLite records but are excluded from the default Active presentation and available in Closed.
- **TASK LIST = NAVIGATION, TASK DETAIL = INFORMATION:** collection rows expose compact identity/status context; goal, lifecycle actions, and complete metadata remain in the opened Task detail.
- Task archive and hard delete are explicitly deferred. Cancel is not delete, terminal Tasks are retained, and no destructive cascade behavior is introduced.
- **AGENT â‰  PROVIDER â‰  MODEL:** an AI Studio Agent is persistent identity; its Provider and Model are replaceable binding metadata.
- **PERSISTENT IDENTITY + REPLACEABLE INTELLIGENCE BACKEND:** Agent IDs remain stable when a future binding changes.
- **CAPABILITY â‰  PERSONALITY** and **ROLE â‰  IDENTITY:** capabilities and role summaries are provisional, machine-readable participation hints, not personas or permissions.
- **NORMALIZE COMMON, PRESERVE UNIQUE:** the adapter contract normalizes identity, availability, text request, and response fields while generic extension types leave provider-specific behavior behind adapters.
- **NO FAKE ACTIVITY:** initial Agents and adapter descriptors are unavailable/unconfigured; Stage 5 performs no inference and presents no simulated execution state.
- GPT, Gemini, and Codex are global application-defined Agents rather than per-Workspace SQLite rows. User-created Agents and persistent Agent configuration are deferred.
- Capability metadata describes potential fit only. It grants no connection, permission, approval, or autonomy.
- **Mock Provider â‰  Fake Agent:** `agent-gpt` keeps its stable identity and production binding while the server applies an explicit test-only Mock binding.
- **Provider Connectivity â‰  Agent Permission:** successful Mock invocation grants no terminal, repository, filesystem, external-action, or autonomous Task authority.
- **UI â†’ Application â†’ Adapter â†’ Provider:** React calls only the same-origin API; `AgentInvocationService` owns resolution and validation behind the server boundary.
- **FAIL HONESTLY** and **NO SILENT FALLBACK:** unknown/unavailable/unconfigured/malformed/failed cases return safe normalized errors; real configuration never silently substitutes Mock.
- **ORCHESTRATOR â‰  AGENT â‰  PROVIDER ROUTER:** orchestration depends on an Agent invocation port and a plan builder, never provider implementations.
- **MINIMUM SUFFICIENT COLLABORATION:** only explicit participants run once, in order; one-Agent and multi-Agent plans share the same abstraction.
- **HANDOFF â‰  CONTEXT DUMP:** bounded immediate contribution context, no Chat transcript import or hidden reasoning trace.
- **SHOW CONTRIBUTIONS; HIDE COORDINATION NOISE:** identity/backend provenance and final ownership are visible; handoff details are optional disclosure.
- **CollaborationPlan â‰  Workflow; Task â‰  Collaboration â‰  Execution.** Structural convergence only; Stage 8 now wraps collaboration with a bounded Execution lifecycle, not a Workflow Engine or autonomous loop.
- **Mock collaboration â‰  real provider connectivity.** Chat and Task schemas/services stay unchanged. Stage 7 added no migration; Stage 8 adds non-destructive Migration 4 for Execution snapshots only.
- **CANCEL EXECUTION, PRESERVE USEFUL WORK; FAILURE SHOULD INTERRUPT WORK, NOT ERASE WORK.** Pending controls and returned contributions are reconciled at safe boundaries and saved atomically using optimistic revisions.
- Execution uses a location-neutral runtime port. Only Prototype Local Runtime is implemented, requiring one server per database. Future runtimes remain deferred; connection/capability/permission/approval/autonomy boundaries are unchanged.
- Checkpoints preserve observable application state only. Paused work resumes from the next incomplete step. In-flight work found after restart becomes terminal Interrupted; no silent replay or speculative recovery.
- The UI's explicit pause-after-step demo policy makes instant Mock behavior verifiable without claiming provider suspension. API requests can omit/disable this policy for uninterrupted bounded execution.
- **EXECUTION OUTPUT â‰  ARTIFACT:** formal outcomes exist only after an explicit preserve request; terminal Execution history is never mutated.
- Prototype 0 uses many Artifacts per Task and one stable current Task Report per Task. Report regeneration refreshes the same identity from observable records and does not fabricate version history or AI synthesis.
- Stage 9 Migrations 5 and 6 add Artifact/Task Report snapshots and restrictive relational provenance/reference integrity without rewriting Stage 1â€“8 data.
- **OUTCOME â‰  KNOWLEDGE; REVIEW BEFORE SAVE:** preparation is local SQLite-only, not external export. Core/application Knowledge logic depends on repository/connector ports, not Obsidian or filesystem implementations.
- Stage 10 additive Migration 7 stores Knowledge snapshots/status/revisions with restrictive Workspace/Task/source foreign keys. Scope validation remains in `KnowledgeService`; SQL remains in `SqliteKnowledgeRepository`.
- `ObsidianConnector` validates an explicitly configured existing vault and bounded generated area. It rejects traversal, links/junctions, unsafe files and overwrite, publishes via exclusive temp + fsync + atomic no-replace hard link, and returns explicit outcome/path.
- Approval binds a fresh preview to the current snapshot and destination; durable pending intent precedes publish. Failed writes retain candidates and sources. Repeated saves of one identity require matching bytes; new candidates receive new UUID-based names. Saved missing/edited notes are reported, never replaced.
- Markdown keeps an immutable first save-approval timestamp for retry identity; SQLite/UI separately expose confirmed `savedAt`. No automatic export or restart retry and no final permission-engine claim.
- Stage 11 `GovernanceService` owns normalized decisions and scoped one-use approvals. Only explicit policy grants can authorize; PHYSICAL is reserved and always denied. The configured HAN publication grant is global across Workspaces, but each approval binds one Workspace, Knowledge ID, action, connector, destination fingerprint and reviewed snapshot fingerprint.
- Migration 8 only adds immutable consumed approvals and append-only audit tables/index/triggers with restrictive Workspace/approval references. No historical audit backfill or Stage 1â€“10 schema rewrite.
- Required evidence fails closed before a consequential action. Post-action audit failure reports uncertainty without erasing retained Knowledge or falsely claiming no file exists. Secret values/content/raw errors never belong in audit; references and safe codes do.
- Stage 12 **CONTEXT PACKAGE â‰  WORKSPACE DUMP; TELEMETRY â‰  AUDIT â‰  BILLING.** Existing supplied text remains bounded at 2,000 UTF-16 characters, goal 500, immediate contribution 800, â‰¤6 metadata items. Fixed omissions and original/supplied sizes expose exclusions/truncation honestly. No automatic retrieval or hidden reasoning storage.
- Additive Migration 9 creates ordered unique start/final invocation telemetry with restrictive scope references and append-only triggers. Existing migrations and historical rows are not rewritten or backfilled.
- Telemetry-start persistence failure prevents the provider call as an operational error, not an authority denial. Final telemetry failure retains successful output with an unconfirmed marker; provider failures get safe failure records when possible. Context failure makes no provider call and preserves completed work. No automatic replay.
- Usage is provider-reported, explicitly Mock/synthetic, or unavailable. Invalid/missing counters become unknown, never inferred billing; cost is null. Monotonic duration excludes SQL writes and human pauses; UTC start/completion are separate timestamps.
- Stage 13 repairs recovery boundaries without replacing sealed services: additive optional Artifact creation UUID, truthful already-saved audit result, checkpoint read/startup validation and isolated dev HMR binding. No lifecycle, permission grant, context bound, schema or provider redesign.
- Stage 14 is presentation/acceptance only. Normal versus Inspect is progressive disclosure, not a permission boundary. No runtime/safety contract is weakened to simplify the screen. No global Continue Active Work model, automatic refresh chain, automatic start/save or new lifecycle is introduced.

## Changed Interfaces

- npm commands: `dev`, `test`, `test:watch`, `build`, `start`, `preview`.
- environment: `HAN_AI_STUDIO_DATA_DIR`; browser-safe display values may use `VITE_*`.
- runtime configuration: `HAN_AI_STUDIO_HOST`, `HAN_AI_STUDIO_PORT`, and `HAN_AI_STUDIO_DATA_DIR`.
- local HTTP API: Stage 2 workspace endpoints plus `GET/POST /api/workspaces/:workspaceId/chats`, `GET/PATCH /api/workspaces/:workspaceId/chats/:chatId`, and `GET/POST /api/workspaces/:workspaceId/chats/:chatId/messages`.
- Stage 3 UI exposes workspace-scoped chat create/list/open/rename/back navigation and human-message create/history; it does not claim to generate an AI response.
- Task API: `GET/POST /api/workspaces/:workspaceId/tasks` and `GET/PATCH /api/workspaces/:workspaceId/tasks/:taskId`; filtered related Tasks use `sourceChatId` on the list route.
- Stage 4 UI exposes compact, bounded Active and Closed views for Workspace Tasks and Chat-related Tasks without adding providers, execution, progress, participants, artifacts, or logs.
- Stage 5 application boundary exposes `AgentRegistry` plus `ProviderAdapterRegistry`; the latter resolves honest unavailable descriptors now and executable adapters only when supplied later.
- Stage 5 changes no local HTTP endpoint. Provider SDKs, credentials, settings, model selectors, inference, and Task assignment remain absent.
- Stage 6 adds `GET /api/agents/invocation-targets` and `POST /api/agents/:agentId/invoke`. `HAN_AI_STUDIO_PROVIDER_MODE` is `mock` by default or `none`; it contains no secret.
- Development startup watches `src/server` so API route/composition changes restart alongside Vite client hot reload without watching Vite-generated files; unknown `/api/*` requests return JSON 404 rather than the SPA document.
- No real adapter was implemented because no provider credential/configuration exists and Stage 6 completion must not depend on network or quota. No Provider SDK dependency was added.
- Stage 7 adds `POST /api/collaborations` with typed request/plan/handoff/result contracts; HTTP 400 is request validation, while HTTP 200 carries an explicit succeeded/failed collaboration result. No history endpoint or persistence is added.
- `AgentInvocationService.assertInvokable()` shares existing resolution checks for orchestration preflight; malformed output/backend-mode validation is hardened and unconfigured bindings are excluded from target discovery.
- Stage 8 adds execution create/list/get and explicit control routes under `/api/workspaces/:workspaceId/executions`. Invalid transitions/conflicts are JSON 409; persistence errors are JSON 503. Accepted controls are 202, not claims of completed work.
- Stage 7 exposes `createPlan` and `contributeNext` as a narrow step seam reused by both standalone collaboration and `LocalExecutionRuntime`; no SQL/lifecycle/provider logic was moved into the Orchestrator.
- Stage 9 adds Artifact and Task Report create/list/get routes under `/api/workspaces/:workspaceId`; outcome scope/validation remains in `OutcomeService`, SQL remains in `SqliteOutcomeRepository`.
- Stage 10 adds `GET/POST /api/workspaces/:workspaceId/knowledge`, item GET, preview GET, explicitly approved save POST, and verify GET. Invalid input/approval 400, scope 404, stale/conflict/state 409, unsupported method 405, connector/storage failure 503.
- Server-only `HAN_AI_STUDIO_OBSIDIAN_VAULT` configures the existing vault. The executable loads ignored `.env.local`; existing process environment wins. Automated server fixtures receive explicit temporary roots and do not load local configuration.
- `Reviewed Knowledge` UI supplies Artifact/Task Report/manual selection, candidate history, content/provenance/Markdown/path review, explicit approval/save/retry, visible errors and read-only verification. Overall UI architecture is unchanged.
- Stage 11 adds GET `/api/governance/session` (local CSRF context, not a provider secret), GET `/api/governance/secrets` (reference/status only), and scoped Knowledge `/:id/governance` and `/:id/audit` GET routes. Preview includes `PermissionDecision`. Save requires current session header and explicit review; valid requests lacking authority return 403, lacking approval 409, audit failure 503. Malformed requests remain 400.
- New configuration: `HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION=review|deny` (unknown values deny), and optional server-only `HAN_AI_STUDIO_SECRET_OPENAI/GEMINI/GITHUB/ENGINE`. No credentials were added; vault path remains configuration, not a SecretRef. Non-loopback deployment is rejected.
- Stage 12 adds read-only GET `/api/workspaces/:workspaceId/executions/:executionId/telemetry`, guarded by the existing trusted local-owner check and persisted scope validation. Invalid scope is 404, untrusted origin 403, non-GET 405, malformed URI 400, read fault 503; errors are safe and visible.
- Context Package/Snapshot and Usage/Telemetry contracts extend the existing Runtime â†’ Orchestrator â†’ Invocation â†’ Adapter path. Provider requests add invocation/context IDs; responses add optional normalized usage; invocation results/contributions add optional measurements, preserving old records. No new configuration, dependency or provider.
- Stage 13 Artifact POST accepts optional UUID-v4 `creationId`; validated exact repeats return the stored Artifact (201, existing response shape), mismatched intent 409 `creation_conflict`, malformed ID 400. Unknown persistence errors describe unconfirmed save, not a false guarantee of rollback.
- Stage 13 adds safe audit code `already_saved_verified` using the existing `not_executed` outcome. Execution list/get/control rejects inconsistent checkpoints with 409 `invalid_checkpoint`; startup recovery rejects invalid running checkpoints without repair or replay. No new endpoint or environment variable.
- Stage 14 changes user-facing placement/copy only: normal Workspace workflow and collapsed Advanced/Inspect sections. No API, environment variable, schema, dependency or service interface change.

## Uncommitted Work

- Post-Stage-14 Real OpenAI GPT vertical slice implemented and verified through the external provider boundary on 2026-09-30.
- Real smoke test reached OpenAI and received HTTP 429; successful GPT output remains pending usable API credit.
- See `docs/REAL-OPENAI-INTEGRATION-2026-09-30.md` for the exact status.

## Blockers

- Successful live GPT generation is blocked by unavailable OpenAI API credit. No further API calls are required until HAN chooses to fund API usage.

## Next Exact Action

PAUSE active HAN's AI STUDIO development. Preserve the current baseline and real-provider work. HAN will focus on learning and using ChatGPT + Codex before deciding which capabilities justify further Studio development. When development resumes, begin from real usage needs; do not restart speculative architecture work.

## Relevant Architecture Documents

- `docs/ARCHITECTURE.md` â€” authoritative Prototype 0 stack and boundaries.
- `BUILD-PLAN.md` â€” staged implementation roadmap.
- `AI-STUDIO.md` â€” historical context only.
- `docs/STAGE-8-VERIFICATION.md` â€” exact human test procedure, builder evidence, safe-boundary/recovery limits and review points.
- `docs/STAGE-9-VERIFICATION.md` â€” exact Artifact/Task Report closed-loop procedure, builder evidence, limits and review points.
- `docs/STAGE-10-VERIFICATION.md` â€” Knowledge/Obsidian approval loop, exact real-vault disposable note path, persistence/retry evidence, limitations and Architect review points.
- `docs/STAGE-11-VERIFICATION.md` â€” exact governance contracts/enforcement, failure policy, isolated browser evidence, real-vault observation and Architect review points.
- `docs/STAGE-12-VERIFICATION.md` â€” current Context/Usage contracts, bounds, privacy, failure semantics, persistence and actual browser/restart evidence. `docs/STAGE-12-ENGINE-INTEGRATION.md` is historical deferred planning, not this stage's gate.
- `docs/STAGE-13-VERIFICATION.md` â€” closed-loop integration, exact browser/restart evidence and disposable note path, retry/uncertainty policy, test coverage and limitations.
- `docs/STAGE-14-VERIFICATION.md` â€” release-candidate acceptance matrix, Normal/Advanced decisions, regression/build/browser/restart evidence, exact isolated note and limitations.

## Stage Gate

- **Current Stage:** Stage 14 â€” Prototype 0 Release Candidate
- **Stage Status:** Builder complete â€” awaiting Architect review and HAN acceptance; NOT PUSHED; NOT SEALED
- **Post-Prototype-0 work:** Real OpenAI vertical slice implemented; further product development intentionally PAUSED after 2026-09-30.
