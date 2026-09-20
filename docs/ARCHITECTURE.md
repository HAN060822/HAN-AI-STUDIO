# Prototype 0 Architecture Baseline

## Selected stack

- **Language:** strict TypeScript for browser and local application code.
- **Web UI:** React with Vite.
- **Local runtime:** a small Node.js same-origin HTTP server, with Vite middleware in development and static asset serving in production.
- **Structured persistence:** Node.js 24's built-in `node:sqlite` `DatabaseSync`, behind application and repository interfaces.
- **File persistence:** ignored `var/` storage for artifacts, checkpoints, exports, and logs.
- **Testing:** Vitest, jsdom, and Testing Library.
- **Desktop path:** a thin Tauri or equivalent wrapper may host the built web UI later; Stage 0 does not lock one in.

This stack is web-first and produces portable static assets. One TypeScript repository and deployable application preserve a modular monolith while allowing shared contracts without coupling the domain to React. SQLite and filesystem storage support local ownership. Explicit ports will isolate providers and connectors. One fast test command covers browser-facing and dependency-free domain code.

## Dependency direction

```text
web/app -> application use cases -> core domain + ports
                                  <- provider adapters
                                  <- external connectors
                                  <- SQLite/filesystem storage
```

The UI may call application use cases, never provider SDKs, SQLite, or Obsidian directly. Core modules may not import UI, storage, provider, or connector implementations. Agent, provider, and model identities remain separate. Conversation, task, execution, and knowledge remain separate concepts even when a screen composes them.

## Intended module growth

Stages 2–4 exercise `core/workspaces`, `core/conversations`, and `core/tasks`, matching application ports/services, SQLite repositories, and local server routes while keeping browser presentation and typed API clients in `src/app`. Stage 5 adds `core/agents`, `core/providers`, and matching application registries because the Home UI now consumes those boundaries. Cohesive `orchestrator`, `execution`, `context`, `knowledge`, `permissions`, `observability`, and `connectors` modules are added when first used. This reserves boundaries without empty architecture scaffolding.

## Application/data separation

Tracked source and configuration stay in the repository. Mutable user data defaults to `./var`, configurable through `HAN_AI_STUDIO_DATA_DIR`, and is ignored except for `var/.gitkeep`. The Workspace database is `var/studio.sqlite`; WAL and other SQLite sidecars are ignored. Production output goes to ignored `dist/`. Secrets belong in ignored environment files or a future OS-backed facility; they must never use `VITE_*`, because Vite embeds those values in browser assets.

## Stage 2–4 persistence and runtime

The React browser calls same-origin `/api/workspaces` endpoints. The local Node server converts transport input into `WorkspaceService` operations. The service owns validation, stable UUID creation, timestamps, and lifecycle semantics through a `WorkspaceRepository` interface. `SqliteWorkspaceRepository` is the only layer that knows SQL.

The React browser calls same-origin Workspace and Conversation HTTP endpoints. The local Node server converts conversation transport input into `ConversationService` operations. That service validates titles and content, owns workspace-scope checks, UUID creation, timestamps, and the current user-only authoring behavior through a `ConversationRepository` interface. `SqliteConversationRepository` is the only layer that knows conversation SQL.

Schema evolution uses an append-only `schema_migrations` table and numbered migrations applied inside `BEGIN IMMEDIATE` transactions. Migration 1 creates `workspaces` and its status/update index. Migration 2 adds `chats` and `messages`, both scoped by restrictive foreign keys (`ON DELETE RESTRICT`) and indexed for their deterministic list order. SQLite runs with foreign keys, WAL journaling, and a five-second busy timeout. Migrations do not delete or rewrite existing data.

A `Chat` belongs to one `Workspace`, and a `Message` belongs to one `Chat`; they are not tasks or provider output. Chat lists order by `updated_at DESC, id ASC`; message histories order by `created_at ASC, id ASC`. Message types reserve `user`, `agent`, and `system`, while Stage 3 permits the user-created role only. The browser never opens SQLite or issues SQL.

Stage 4 adds `Task` as the first persistent work object. A Task belongs to exactly one Workspace and may reference one source Chat from that same Workspace. It has independent identity, title, goal, planning status, timestamps, optional completion timestamp, and schema version. Task lists order by `updated_at DESC, id ASC`. `TaskService` validates identity scope, source-Chat scope, content, and transitions through a dedicated `TaskRepository`; browser code never issues Task SQL.

Migration 3 transactionally adds `tasks`, its Workspace/update index, and source-Chat/update index. Both foreign keys use `ON DELETE RESTRICT`; the source Chat reference is nullable so Workspace Tasks do not require a Chat. Migration 3 neither rewrites nor deletes Workspace, Chat, or Message data.

Stage 4 uses the honest pre-execution states `draft`, `discussing`, `paused`, `blocked`, `completed`, and `cancelled`. Valid transitions are defined in the Task domain. Completed and Cancelled are terminal. These states represent planning and human-maintained Task state only: Task is not Execution, and Stage 4 creates no execution records, runtime activity, progress, participants, or logs.

Task collection presentation derives two views from persisted status. Active contains `draft`, `discussing`, `paused`, and `blocked`; Closed contains `completed` and `cancelled`. This is a presentation boundary, not a storage lifecycle: **DATA RETENTION ≠ ACTIVE UI PRESENCE**. Completion and cancellation retain the Task ID, Workspace and source-Chat relationships, content, status, and timestamps in SQLite. Refresh and runtime restart reproduce the same classification from those persisted records.

Task collections follow **TASK LIST = NAVIGATION, TASK DETAIL = INFORMATION**. Bounded, scrolling lists use compact rows for title, status, optional Chat linkage, and update time; opening a Task reveals goal, metadata, editing, and lifecycle actions. Workspace and Chat surfaces are Active-first, with terminal Tasks inspectable through their separate Closed view. Archive and destructive delete are deferred: cancellation is not deletion, and Stage 4 adds neither a fourth migration nor cascade removal.

## Stage 5 Agent and Provider boundaries

**AGENT ≠ PROVIDER ≠ MODEL.** An Agent is a persistent AI Studio collaborator identity. A Provider is an external capability source, and a Model is a replaceable backend exposed through that Provider. The architecture therefore preserves **PERSISTENT IDENTITY + REPLACEABLE INTELLIGENCE BACKEND**: `agent-gpt`, `agent-gemini`, and `agent-codex` remain stable independently of their inspectable `ProviderBinding` values.

The initial global `AgentRegistry` is application-defined configuration rather than SQLite data. HAN cannot yet create, edit, delete, or configure Agents, so a fourth migration would add persistence without a Stage 5 use case. The Registry lists and resolves Agents and supports machine-readable capability queries. Workspaces present the global team without duplicating Agent identities per Workspace.

Capabilities and role summaries are intentionally lightweight: **CAPABILITY ≠ PERSONALITY** and **ROLE ≠ IDENTITY**. They describe possible participation, not personas, connection state, permission, approval, or autonomy. All initial Agents are `unavailable`, their bindings are `unconfigured`, and the Home UI says providers are not connected. **NO FAKE ACTIVITY:** Stage 5 never labels an Agent as thinking, researching, building, reviewing, or working without a runtime state.

`ProviderAdapter` defines the minimum normalized future execution seam: descriptor identity and availability, a text request tied to an Agent ID, and a response that reports Provider/Model identity and output. Generic extension types implement **NORMALIZE COMMON, PRESERVE UNIQUE** without leaking provider-specific behavior into the UI or Agent domain. `ProviderAdapterRegistry` can resolve descriptors separately from executable adapters. Stage 5 registers unavailable OpenAI, Gemini, and Codex descriptors but no executable implementation; the deterministic fake exists only in tests.

No provider SDK, network request, API key, OAuth flow, server route, model selector, streaming contract, tool call, Task assignment, permission grant, or execution record is introduced. Real/mock adapter implementations and server-side secret handling are Stage 6 or later concerns.

## Stage 6 executable intelligence boundary

Stage 6 implements **UI → Application → Adapter → Provider** through same-origin Agent routes and `AgentInvocationService`. The service resolves the persistent Agent, applies an explicit runtime binding, resolves an executable adapter, validates configuration/availability, executes a normalized request, validates the response, and returns machine-readable Agent, Provider, Model, mode, and success metadata.

The default Prototype configuration binds `agent-gpt` to `mock` / `mock-basic` without changing its identity or Stage 5 production status. **Mock Provider ≠ Fake Agent.** Results are deterministic and visibly marked Mock. `HAN_AI_STUDIO_PROVIDER_MODE=none` disables the executable test target; there is **NO SILENT FALLBACK** from a real provider to Mock.

No real adapter was added: the environment has no configured credential and a speculative integration would make normal verification depend on external network, quota, and untested secret handling. Mock uses no secret or network. Provider credentials remain server-only future configuration and never enter browser code or SQLite.

Invocation failures **FAIL HONESTLY**: unknown Agent, unavailable Agent, unconfigured binding, unavailable adapter, provider failure, invalid input, and malformed response have safe application errors. **Provider Connectivity ≠ Agent Permission**; an invocation grants no tool, terminal, repository, filesystem, external-action, approval, or autonomy rights. Task remains separate from invocation and Execution.

Stage 7 inherits the stable Agent Registry, runtime binding seam, adapter resolver, normalized result metadata, safe failure model, and single-Agent invocation service. It does not inherit routing, delegation, collaboration, or orchestration behavior because none is introduced here. **NORMALIZE COMMON, PRESERVE UNIQUE** remains implemented through generic adapter extensions.

Node's built-in SQLite API was selected over an ORM or native package because Node 24 is the repository baseline, it introduces no new dependency or compilation step, and the repository interface keeps the implementation replaceable.

## Stage 7 deterministic collaboration

**ORCHESTRATOR ≠ AGENT. ORCHESTRATOR ≠ PROVIDER ROUTER.** `OrchestratorService` coordinates stable Agent identities through the narrow `AgentInvoker` port (`assertInvokable` and `invoke`), implemented by the existing `AgentInvocationService`. It imports no adapter implementation, provider registry, SDK, storage, Chat, or Task service. Provider resolution and response normalization stay below the invocation boundary. Runtime composition explicitly binds GPT and Gemini to the same deterministic Mock adapter without changing their production registry entries; Codex is not automatically included. **Mock collaboration ≠ real provider connectivity.** All three production cards remain unavailable/unconfigured. `HAN_AI_STUDIO_PROVIDER_MODE=none` disables both test targets without substitution.

The hybrid architecture begins with a deterministic core and an injectable `CollaborationPlanner` seam. The default planner creates stable `step-1`, `step-2`, etc. identities in the explicit participant order. A future intelligence-assisted planner must return the same validated coordination description; there is no autonomous GPT coordinator. **CollaborationPlan ≠ Workflow**: this is a one-request, bounded description, not a reusable procedure or workflow runtime.

`CollaborationRequest` contains a goal, ordered distinct `participantAgentIds`, and `collaborationMode`. Goals are 1–500 characters. Sequential accepts one to three selected Agents; Review / Challenge accepts exactly two: a primary draft contributor and a contextual reviewer. Reviewer is a role for this request, never a personality or new identity. Parallel is deferred to avoid additional semantics before the Stage 8 gate. **MINIMUM SUFFICIENT COLLABORATION** means only the selected participants are called, once each, in order. One-Agent plans use the same abstraction. Planner output cannot add, remove, reorder, repeat, or substitute participants or change the original goal/mode.

**HANDOFF ≠ CONTEXT DUMP.** The Standard-style `AgentHandoff` includes source and target Agent IDs, the original goal, the immediate previous contribution (at most 800 characters), a machine-readable truncation flag, and an explicit requested next action. No automatic Chat access or accumulated transcript exists. Sequential asks the next Agent to continue toward the goal. Review asks the second Agent to challenge the draft and give a review conclusion. Labeled bounded text transports these fields through the existing text invocation contract, staying under its 2,000-character input limit. Truncation is deterministic, not intelligent summarization, and may omit relevant trailing content; full successful contributions remain in the result.

`CollaborationResult` is a discriminated succeeded/failed result with original mode/goal, the plan, ordered contributions, an attributable final contribution on success, and an identified failed step on failure. Every contribution preserves Agent ID/display name, step ID, Provider/Model, machine-readable Mock/Real mode, status, output, and incoming handoff. Structural convergence means all required steps succeeded and the final required contribution exists; it does not assert semantic agreement or answer quality. No synthesis Agent or anonymous merged answer is added.

Request/plan validation occurs before invocation. All required participants pass preflight using the invocation service; unknown identities, missing or unconfigured bindings, and unavailable adapters fail honestly. An invocation is revalidated when called. Provider failures and malformed results fail the required step, preserve completed contributions, and return no false final. There is no skip, Agent replacement, retry, or real-to-Mock fallback. Unknown exceptions are normalized without disclosing their raw messages. Stage 6's response validation now also rejects null/non-string output and mismatched backend mode; unconfigured bindings are no longer advertised as executable targets.

The same-origin `POST /api/collaborations` endpoint accepts requests, never caller-supplied runtime instructions or plans. Invalid requests return HTTP 400; accepted requests return HTTP 200 with an explicit `result.status`, including honest collaboration failures. The browser must inspect that status, not infer collaboration success from the HTTP code. No GET history endpoint exists. The Home Prototype Collaboration panel exposes goal, mode, explicit ordered test participants, bounded contributions, optional handoff details, and attributed final output. Loading, configuration absence, transport failure, and step failure are visible. **SHOW CONTRIBUTIONS; HIDE COORDINATION NOISE**: handoff details are collapsed initially, and private reasoning traces are neither requested nor stored.

**Task ≠ Collaboration ≠ Execution.** Chat stays human-authored persistent discussion; Task stays the unchanged persistent work object. Collaboration results live only in request/browser memory and disappear on refresh or Home unmount. No collaboration persistence, no Task schema changes, **No Migration 4**. Stage 8 may wrap this request-scoped service with runtime controls, but no Execution entity, state machine, checkpoint, scheduler, background work, pause/resume/interrupt/cancel, approval gate, retry/recovery policy, or Task execution exists in Stage 7.

**Connection ≠ Capability ≠ Permission ≠ Approval ≠ Autonomy.** Coordination grants no new authority. No tools, filesystem/terminal/GitHub access, network inference, secrets, recursive loops, or unbounded autonomous work are introduced. There are no new dependencies. Prototype behavior remains deterministic and approximately Autonomy Level B (Collaborative).

The Stage 7 handoff narrows the older roadmap's references to shared Task context, persisted decisions, and progress: these are deliberately deferred, not implemented under another name. Service-source changes outside `src/server` require a development-server restart under the existing scoped watcher; the browser surface is still Vite-hot-reloaded. Verification includes normal `npm.cmd run dev`, a full restart, and deterministic `mock`/`none` HTTP tests.

## Stage 8 durable Execution and human control

**TASK ≠ EXECUTION; EXECUTION ≠ COLLABORATION; EXECUTION ≠ AGENT RUN.** A Task remains an unchanged planning/work object. An Execution is one explicitly created attempt, Workspace-scoped and optionally linked to a same-Workspace Task. Its goal is a deliberate immutable snapshot, not a live alias to the Task goal. Multiple attempts may link to one Task. No execution transition changes Task status or writes Chat messages.

The path is `ExecutionService → ExecutionRuntime → LocalExecutionRuntime → OrchestratorService.contributeNext → AgentInvocationService → Provider Adapter → Backend`. `ExecutionRuntime` is a small location-neutral port exposing an identifier, plan preparation and one next contribution. The only implementation is `prototype-local`. Execution identity/status do not encode a laptop, process, provider, or collaboration mode. Future Cloud, External Agent, and Physical runtimes are seams only, not implementations, selectors, dependencies, or permissions. No runtime migration/distributed framework is introduced.

Stage 7's existing planning and per-step handoff logic was extracted into `createPlan` and `contributeNext`; the standalone `collaborate` use case still uses it and retains its original all-participant preflight, result contract, and tests. Orchestration owns no persistence, HTTP, UI, lifecycle controls, or provider implementation. The Execution runtime validates availability when each remaining step is invoked, so a later unavailable Agent fails that step while preserving earlier work. No fallback or substitution occurs.

The Execution record contains UUID, Workspace/optional Task IDs, runtime ID, status, immutable plan/goal, checkpoint, pending control, safe-boundary demo option, attributable failure, created/started/updated/finished timestamps, schema version, and optimistic revision. The checkpoint contains `nextStepIndex`, `currentStepId`, and ordered successful contributions with the existing Agent/Provider/Model/mode/handoff provenance. This is reconstructable application state, not process memory, model hidden state, or chain of thought.

### State machine

| From | Permitted destinations |
| --- | --- |
| created | running, cancelled |
| running | paused, cancelled, interrupted, failed, completed |
| paused | running, cancelled |
| completed / failed / cancelled / interrupted | none |

Plan validation happens before creation, so a separate Preparing state is unnecessary. Start accepts only Created; Resume accepts only Paused. Duplicate starts, repeat/invalid controls and terminal-state reopening are rejected (HTTP 409), not treated as successful no-ops. All required steps must have produced a saved contribution before Completed. Terminal records have `finishedAt`; failure and cancellation never imply a successful final result.

### Checkpoint and control ordering

Migration 4 adds only `executions` and its Workspace/update and runtime/status indexes. Restrictive foreign keys retain referenced Workspace and optional Task records. No existing schema/record is rewritten or deleted. The service checks Task/Workspace scope. `SqliteExecutionRepository` owns SQL, stores the full versioned Execution snapshot as JSON with indexed identity/state metadata, and atomically updates lifecycle, checkpoint, contributions and pending control in one compare-and-swap statement. A stale revision is rejected. The UI and Orchestrator never access SQLite.

Before a provider step starts, its in-flight intent is durably recorded. After the call settles successfully, its contribution, next index, cleared in-flight marker and resulting status are saved together. Fresh control intent is read after every awaited call so an in-flight pause/cancel is not overwritten by an old snapshot. No next step starts before that checkpoint succeeds. Persistence failure stops the driver and produces an explicit observation/control error; it cannot promise durability for an output that could not be written. The last committed checkpoint remains the recovery boundary.

- **Pause:** while Running, persist `pendingControl=pause`. Status remains Running until the current call settles; the underlying model call is not suspended. At the next safe boundary, preserve its successful output and stop before the next step. If no steps remain, completion wins over a now-unnecessary pause.
- **Resume:** continue only from a Paused, consistent checkpoint; already completed steps are not replayed. Original plan/participants/goal remain unchanged.
- **Cancel:** Created/Paused cancel immediately without invocation. Running records a pending cancellation, preventing subsequent steps after the current call settles. Its successful output is retained, even if cancellation arrived during the final call. Cancel can supersede pending Pause. A failed call remains an attributable Failed result rather than being hidden by a pending control.
- **Deterministic demo:** UI defaults `pauseAfterStep=true`, stopping after each successful non-final step. This is a real runtime boundary policy, not latency injection or fake provider suspension. The API defaults it to false if omitted. With two Mock Agents, Start pauses after GPT and Resume runs Gemini to completion.

**CANCEL EXECUTION, PRESERVE USEFUL WORK. FAILURE SHOULD INTERRUPT WORK, NOT ERASE WORK.** Contributions survive cancellation/failure/reload. Errors identify the step and Agent with normalized safe messages. No retries, deletion, semantic convergence, or automatic alternative Agent invocation are introduced.

### Recovery, observation and limitations

Created and Paused attempts remain dormant across restart; only HAN's explicit Start/Resume runs them. Completed, Cancelled and Failed attempts remain inspectable and terminal. On startup, the Local Runtime marks its persisted Running records Interrupted, preserving checkpoint and uncertain step identity. It does not know whether an uncheckpointed external call finished, so it never silently retries or offers Resume for an Interrupted attempt. This intentionally favors avoiding duplicate work over speculative recovery. Safe paused checkpoints are resumable after full process restart.

The Local Runtime executes bounded, explicitly requested asynchronous work within the current server process. There is no background scheduler, automatic restart continuation, durable job queue, multi-process ownership/lease protocol or 24/7 service. Use one server per database. Graceful shutdown stops at a boundary and retains work; abrupt termination can lose an in-flight result not yet checkpointed. Mid-call provider suspension/abort, provider deadlines, recovery of uncertain calls, and distributed ownership are not implemented. Current deterministic Mock completes quickly and uses no external network/credentials. Actual computation is Mock echo, not intelligence.

Workspace UI adds a separate Prototype Executions panel: creation, optional Task link, goal/mode/explicit participants, history, status/progress, timestamps, provenance, final ownership, preserved failure, and supported controls. A 500ms UI observation poll runs only while a loaded record is Running; polling cannot start/resume work. Pending controls and stale observation failures are visible. Refresh updates the Task selector as well as execution history. Home and persistent Chat are not redesigned.

API: `GET/POST /api/workspaces/:workspaceId/executions`, `GET /api/workspaces/:workspaceId/executions/:executionId`, and `POST .../:executionId/controls` with `{action: start|pause|resume|cancel}`. Creation returns 201; accepted controls return 202 with confirmed state (not a claim of completion). Invalid input is 400, missing/cross-scope identity 404, invalid state/conflict/unavailable runtime 409, and persistence failure 503, all JSON. No arbitrary lifecycle PATCH, checkpoint injection, deletion, redirect or approval endpoint exists.

Authority remains unchanged: no secrets, tool access, external actions, permission/approval engine, cloud/physical runtime, recursive autonomy, Artifact/Task Report, Knowledge, telemetry, or Stage 9+ scope. See `docs/STAGE-8-VERIFICATION.md` for the exact human verification path and evidence.

## Stage 9 formal outcomes

**Task ≠ Execution ≠ Execution output ≠ Artifact ≠ Task Report.** Execution contributions remain immutable runtime history. An Artifact is a deliberate, persistent formal outcome owned by one Workspace, optionally associated with one same-Workspace Task, and optionally copied from one committed contribution on one same-Workspace Execution. Creating an Artifact never mutates the source Execution. A Task may own any number of Artifacts.

Prototype 0 uses one current Task Report per Task. The report has stable identity and is explicitly generated or regenerated; regeneration replaces its structured observable snapshot without creating pretend report history. This cardinality gives HAN one canonical current answer to “What happened during this Task and what did it produce?” while deferring report version history. A report snapshots Task identity/goal/planning state, related Executions and statuses, planned/observed Agent identities, contribution counts and final-step identity, attributable failures, and Artifact references. Its summary is deterministic application text, never represented as AI synthesis or hidden reasoning.

The application path is `OutcomePanel → workspace-scoped JSON API → OutcomeService → OutcomeRepository → SqliteOutcomeRepository`. `OutcomeService` owns normalization and all Workspace/Task/Execution/contribution scope checks. The repository owns SQL. Neither React nor the Orchestrator accesses SQLite, and provider/model identity appears only as copied provenance—not an Artifact dependency.

An Artifact contains stable UUID, Workspace ID, optional Task ID, title, kind (`document`, `result`, or `note`), immutable text content, provenance, timestamps, and schema version. Contribution-backed provenance contains source Execution/step plus Agent/Provider/Model/backend mode. Direct application-service/API text Artifacts are also valid and carry null execution provenance; the initial UI intentionally focuses on preserving committed Execution contributions.

Migration 5 adds `artifacts` and `task_reports` with restrictive Workspace/Task/Execution foreign keys, indexed metadata, and versioned JSON snapshots. Migration 6 additively introduces relational Task Report → Execution and Task Report → Artifact reference tables. Report snapshot and reference replacement occur in one SQLite transaction. The two numbered migrations preserve an already-applied Migration 5 during builder smoke work and never rewrite prior records. There is no delete API, cascade, or destructive migration.

API: `GET/POST /api/workspaces/:workspaceId/artifacts`, `GET .../artifacts/:artifactId`, `GET/POST /api/workspaces/:workspaceId/task-reports`, and `GET .../task-reports/:reportId`. Artifact creation returns 201; deterministic report generation/regeneration returns 200. Invalid input is 400, missing/cross-scope identity is 404, and persistence failure is 503, all JSON.

Workspace UI adds a distinct **Artifacts & Task Reports** panel. HAN selects a Task, chooses one committed contribution, names/types and preserves it, inspects copied content and complete provenance, then generates or regenerates the canonical report. Refresh and full runtime restart reconstruct both records. The panel does not turn output into an Artifact automatically, change Task state, edit terminal Executions, write Chat, promote Knowledge, or claim Mock intelligence.

Current limits are deliberate: text content only; immutable Artifact records with no edit/delete UI; one explicitly regenerated current report rather than version history; no binary/file storage, AI synthesis, automatic outcome policy, Knowledge promotion, Obsidian connector, backup system, or Stage 10+ behavior. Existing authority remains unchanged and no credentials, provider calls, external actions, hidden reasoning, permissions, or scheduler were added. See `docs/STAGE-9-VERIFICATION.md`.

## Stage 10 reviewed Knowledge and Obsidian boundary

**Conversation ≠ Execution History ≠ Artifact ≠ Task Report ≠ Knowledge.** Knowledge is deliberately preserved reusable information, never an automatic export of a conversation or every outcome. The path is `KnowledgePanel → same-origin API → KnowledgeService → KnowledgeRepository / KnowledgeConnector → SQLite / ObsidianConnector`. Only the server composition root chooses the concrete connector. Core types and the application service import no Obsidian paths or filesystem implementation; React never writes files.

### Contracts and persistence

`Knowledge` has a stable UUID, Workspace ID, title, immutable content snapshot, source type (`artifact`, `task-report`, `manual`), source/Task/Execution references where available, source snapshot timestamp, created/updated/approved/saved timestamps, schema version, optimistic revision, destination identity/relative path, failure, and explicit `candidate | pending | failed | saved` status. Title is bounded to 180 characters; content to 100,000. Manual input cannot forge source references. Source-based input accepts an existing same-Workspace ID, not caller-supplied content/provenance. A report candidate is a deterministic, visibly non-AI-authored snapshot and does not change if that report is regenerated later. Task and Execution state are never mutated by promotion.

Migration 7 only adds `knowledge` and a Workspace/update index, with restrictive Workspace/Task/Artifact/Task Report foreign keys, checked status, revision, and JSON snapshot. It does not rewrite prior migrations or source records. The repository uses atomic compare-and-swap updates for status and snapshot. Source scope is enforced by the application service, like the existing outcome boundary. SQLite owns the record; Obsidian is the first human-readable external materialization, not the domain model.

The connector port provides read-only `preview`, explicit `publish`, and read-only `verify`. Preview returns connector/destination identity, human-readable destination label, relative path and rendered Markdown. The service binds a SHA-256 review token to the complete current record and preview. Save must include `{approved: true, previewToken}`; stale previews are rejected. This is review freshness, not authentication or a cryptographic permission capability.

### Save ordering and repeat behavior

1. Prepare persists a `candidate` only; it never calls publish or creates a vault directory.
2. Preview validates configuration/path without writes. The UI displays content and destination and requires an unchecked-by-default approval.
3. Explicit Save revalidates the preview, persists `pending` with destination identity and the first approval timestamp, then calls the connector.
4. Connector success becomes `saved` with a separate confirmed `savedAt`; write failure becomes a durable `failed` state with a safe error. Failed/pending records and source outcomes remain available for reviewed explicit retry.
5. If final SQLite confirmation fails after publication, the previous pending intent remains. A retry of this identity recognizes the byte-identical note and confirms it without a duplicate. There is no automatic retry on restart.

The destination becomes fixed on first approval; changing configured vaults cannot silently redirect a pending/failed retry. The stable filename includes Knowledge UUID, so separate explicitly prepared candidates get different files even with identical titles. Repeating a saved record only verifies its existing bytes: a missing or human-modified saved note is reported and never overwritten or silently recreated. Candidates/content are immutable in this prototype; author revised content as a new explicitly reviewed candidate.

### Filesystem and configuration

`HAN_AI_STUDIO_OBSIDIAN_VAULT` is server-only configuration, with no hardcoded personal path. Node loads ignored `.env.local` at the executable entry point before configuration; process environment takes precedence. The server factory takes an explicit optional root and never reads the real-vault environment, keeping temporary automated fixtures isolated. A missing/invalid vault is a visible connector error, not a fallback directory or a server-startup requirement.

The configured root must be absolute, existing, accessible, a real directory, and contain `.obsidian`. All root ancestors and destination components are checked for symlinks/junctions. The only destination is **`Knowledge/AI-Studio-Generated`**, chosen after inspecting the existing vault structure. Canonical `Knowledge/AI/HAN-AI-STUDIO` architecture notes are outside this write surface. Neither API requests nor titles specify paths. UUID validation, ASCII filename sanitization, a non-reserved `knowledge-` prefix, containment checks, and no-overwrite creation prevent traversal and name collisions.

UTF-8/LF Markdown contains JSON-quoted frontmatter scalars for Knowledge/Workspace/Task/source/Execution identity, source timestamp, creation timestamp, `approved_for_save_at`, and schema version, followed by readable title/content. `approved_for_save_at` is the immutable first authorized save-attempt timestamp and is filled only on explicit Save; it is not a claim of confirmed completion. The UI and SQLite separately expose confirmed `savedAt`. Keeping file bytes stable across the publication/confirmation gap makes retries verifiable.

Publication writes and fsyncs an exclusive temporary file in that destination, atomically hard-links it to the final name without replacement, and unlinks only its own temporary name. An existing identical regular, single-link file is idempotent; a different file, symlink/junction, hard-link alias or non-file fails without overwrite. Verification compares exact UTF-8 bytes. This requires a filesystem supporting hard links (the real NTFS smoke passed); unsupported filesystems fail honestly.

### API, UI and limits

Under `/api/workspaces/:workspaceId/knowledge`: GET lists; POST prepares a candidate (201); GET `/:id` retrieves; GET `/:id/preview` previews; POST `/:id/save` explicitly publishes; GET `/:id/verify` compares a saved note. Invalid input/approval is 400, missing/cross-scope is 404, stale review/state/destination conflict is 409, unsupported methods are 405, and connector/storage failure is 503. A publish failure returns the retained failed record plus safe error, never false success. Configuration failures are visible and leave local candidates intact.

The small Workspace engineering panel provides source selection/manual fields, candidate history, provenance/content, expandable Markdown, visible destination/path, approval checkbox, Save/Retry and Verify. Refresh obtains newly preserved Artifacts/reports. Review approval resets when the selected record/preview changes; failures are visible and do not silently mark success. This stage does not redesign the overall UI.

Limits: SQLite and external filesystem are not one transaction; recovery is explicit and conservative. A process crash can leave an owned `.pending-*.tmp` or an unconfirmed note; a leftover hard-link pair fails closed and needs inspection, not automatic deletion. The connector checks paths but does not provide OS-level protection against hostile concurrent directory swaps; assume one trusted local owner/server. Keep loopback binding. This is not Stage 11 authentication, authorization, secrets or audit. No watcher, bidirectional sync, update/delete/conflict resolution, backup, bulk export, automatic extraction, Memory Engine, RAG, embeddings, vector/graph DB, cloud sync, Obsidian plugin, model/router/provider expansion or Stage 11+ work is included.

See `docs/STAGE-10-VERIFICATION.md` for reproducible tests, the single-note real-vault smoke and Architect review points.

## Stage 11 minimum governance

The Stage 5–10 sections above describe their historical scope. Stage 11 now adds a narrow, real enforcement path without expanding provider/runtime capability:

```text
Reviewed Knowledge Save
  -> server-owned local actor + fresh preview
  -> GovernanceService: explicit grant + one-use approval
  -> atomic consumed approval / started audit
  -> existing Knowledge pending intent -> unchanged ObsidianConnector
  -> retained Knowledge outcome -> final audit
```

**CONNECTION ≠ CAPABILITY ≠ PERMISSION ≠ APPROVAL ≠ AUTONOMY.** The UI displays decisions, never manufactures authority. The connector is a trusted server capability behind the service, not an independently exposed write API. Configuration selects a destination; only permission plus explicit approval can authorize publication. Agents, Orchestrator and Execution runtime receive no publication or secret-use grant.

### Permission contract and actor boundary

`Actor` distinguishes `human`, `agent`, and `system` with stable IDs. `ActionIntent` names an action, typed resource/ID, scope, capability, destination fingerprint and reviewed-payload fingerprint. Actions are READ, WRITE, CREATE, MODIFY, EXECUTE, DELETE and EXTERNAL; PHYSICAL is reserved and always denied. Resources include Workspace, Task, Execution, Artifact, Knowledge, Connector, Provider, Filesystem, Secret and Audit.

`Scope` is explicit global, Workspace, Task-in-Workspace or Execution-in-Workspace. Only an explicitly configured global grant spans Workspaces. Workspace grants cover that Workspace's child scopes; Task and Execution grants require the same scope kind and identity. There is no role hierarchy, inherited policy language or implicit Agent trust. The default `GovernanceService` has no grants. `PermissionDecision` is normalized `allowed | denied | approval_required` with fixed safe reason/code and grant reference.

The small runtime policy supplies HAN (`human/han-local`) an explicit global metadata-audit READ grant and, only in `review` mode, an EXTERNAL Knowledge grant for `obsidian-markdown.publish`. The latter still requires exact review/approval on every attempt. `HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION=deny` or an unknown value removes that grant after restart. Existing consumed approvals cannot restore revoked authority. This is code/config policy, not persistent policy administration.

HTTP composition supplies the actor, never the JSON body. `LocalAuthority` requires loopback peer, exact local Host, same-origin Origin when present and same-origin/none Fetch-Metadata when present. Save additionally requires JSON and a random process-local `x-han-session` value obtained from a protected, no-store session endpoint. The UI fetches fresh context for each Save. Server startup rejects non-loopback binding. Client actor/approval fields are invalid input.

This is a local-owner transport/CSRF boundary, **not authentication**: a trusted local process can obtain the same session; same-user malicious code, XSS, compromised adapters, direct filesystem/database access and hostile directory races are not isolated. The server derives authority from the documented single-owner deployment, not from a claim in an Agent response. Other Stage 1–10 internal/Mock routes are not all retrofitted with this guard or audit.

### Approval contract and review composition

`Approval` has UUID, actor, exact canonical intent, grant ID, creation/expiry timestamps and schema version. The service issues it only for a permitted human with an approval-required decision. It is private to that service instance, expires in five minutes, and is consumed on one attempted use, including rejection or audit outage. JSON snapshot matching rejects tampering, wrong actor/action/resource/scope/destination/content, replay and restart reuse. No endpoint accepts caller-created approvals or grants.

One Prototype interaction safely covers two meanings: the checkbox confirms content review **and** authority for the exact visible destination. Save sends that explicit choice with the Stage 10 freshness token. `KnowledgeService` recomputes the current preview, checks the token and builds a consequence fingerprint from the entire current record/preview. `GovernanceService` then creates and immediately consumes a new one-attempt approval after checking current policy. Merely fetching preview or holding the CSRF token never approves a write. No inbox or second redundant approval click is introduced.

The approval record captures the pre-save reviewed snapshot; Stage 10 still sets its first `approvedAt` timestamp when persisting pending state. That documented metadata addition preserves retry byte identity. Failed retry requires fresh human approval and the same bound destination; the connector's create-once/no-overwrite safeguards remain unchanged.

### Audit contract and failure policy

`AuditEvent` records UUID, attempt ID, UTC timestamp, actor or unattributed/null authority, canonical intent references, decision, approval reference, outcome, safe code and schema version. Outcomes are `not_executed`, `started`, `succeeded`, `failed`, or `unconfirmed`. Start/final records share attempt/approval IDs. Known connector failures are `failed`; unexpected exceptions after entering the action are conservatively `unconfirmed`. Raw exceptions, content, titles, prompts, absolute vault paths, session tokens and secret values are not copied into audit. Actor/intent projection strips extra fields and bounds identifiers; service-generated decisions and codes use fixed safe vocabulary.

Additive Migration 8 adds `authority_approvals` and `audit_events`, a Workspace/resource/sequence index, restrictive Workspace/approval references, and triggers preventing updates/deletes. Consumed approval plus start event are one SQLite transaction. Existing migrations and domain records are untouched; there is no invented historical audit. The append-only application/SQL contract is not a cryptographically tamper-proof ledger: a database owner can alter schema/triggers. There is no rotation/retention/export system.

Before external effect, required approval/audit persistence must succeed or the action stops with 503 and source/candidate unchanged. Denied or insufficient approval attempts append `not_executed` and return 403/409; if even that audit fails, return 503 without invoking the action. Structural/scope/stale-preview failures rejected before a valid intent are ordinary validation failures, not audited action attempts. Preview decisions and history reads do not recursively write audit events.

After an action, failure to append final audit returns explicit `audit_unconfirmed` (503): the file may exist and Knowledge may already be saved. Retain those facts, require inspection/Verify and never silently retry or claim rollback. Crash-left start events remain historical uncertainty, not fabricated success/failure. SQLite, filesystem publication and final audit are not one transaction; this conservative gap is intentional and tested.

### Secret contract

`SecretRef` is an allowlist: `provider.openai`, `provider.gemini`, `connector.github`, `engine.local`. `EnvironmentSecretProvider` maps those server-only references to `HAN_AI_STUDIO_SECRET_OPENAI`, `_GEMINI`, `_GITHUB`, `_ENGINE` respectively. Arbitrary environment names cannot be requested. Private environment state is not serialized. `status()` returns configured/unavailable only; `use()` gives a value only to trusted synchronous server code and discards its return value. Missing/blank references prevent consumer execution. Consumer errors become fixed safe `SecretError` messages.

`SecretService` first enforces EXECUTE/secret.use permission and required human approval, then durable start evidence, resolution/consumption and safe success/failure audit. It is tested with dummy values and test-only scoped grants; **no production secret-use grant, resolution HTTP endpoint, real provider or engine is enabled**. The server factory defaults to an empty environment provider, while the executable explicitly injects the process-environment provider after loading ignored `.env.local`.

This is not a custom encrypted vault, callback sandbox, memory-zeroization scheme or content-DLP filter. Trusted consumers must not log/copy credentials; there is no asynchronous adapter contract yet. No secret is automatically copied into ordinary SQLite domain tables, Knowledge, Task Reports, Audit or browser assets. The Obsidian vault path is separate configuration, not a credential.

### API/UI scope and future engine constraints

- GET `/api/governance/session`: local owner/session context; no-store, process-local CSRF value, not a provider credential.
- GET `/api/governance/secrets`: allowlisted reference/status only; no value endpoint.
- Knowledge GET `/:id/preview` adds `decision`; GET `/:id/governance` returns current decision/history; GET `/:id/audit` retrieves recent 20 scoped events even if vault configuration is unavailable.
- POST `/:id/save` requires local session context, exact fresh preview and explicit approval; 403 denied, 409 approval required, 503 evidence failure. Existing validation/conflict/connector semantics otherwise remain.

Knowledge's existing review surface displays the decision/reason and disables denied Save/approval controls. Advanced details are collapsed by default and show safe Secret statuses and bounded recent audit, with explicit load failures. Saved Verify remains read-only. No overall UI redesign or permissions dashboard is added.

The approved Hybrid Engine roadmap below remains planning only. Future engine/provider credentials must remain separate server-side references; engines and MCP tools are not HAN actors by default and inherit no grants. Any future data egress/tool consequence must have a HAN-owned explicit scoped intent, destination/payload binding, permission/approval policy and truthful audit before it is connected. Stage 11 does not yet enforce an engine-wide egress policy because no real engine or such egress exists. Stage 12 is NOT STARTED. See `docs/STAGE-11-VERIFICATION.md` for evidence and review points.

## Stage 0 decisions (historical)

1. Use one TypeScript package while Prototype 0 remains a modular monolith.
2. Use React/Vite without a full-stack meta-framework so local runtime boundaries remain explicit.
3. Defer the SQLite library choice to Stage 2, when runtime and packaging constraints can be tested together.
4. Defer the desktop wrapper choice until validated workflows expose required native capabilities.
5. Add dependencies and modules only when a vertical stage exercises them.
6. Stage 3 keeps conversation persistence deliberately local and provider-free: no AI response is fabricated when a user sends a message.
7. Stage 4 keeps Task lifecycle separate from Chat and future Execution; changing Task state never claims that AI work is running.
8. Stage 4 cleanup separates retained terminal Tasks from active working views and keeps Task collections compact and bounded; Archive and Delete remain later lifecycle decisions.
9. Stage 5 defines global Agents in versioned application configuration, not SQLite, because no user-owned Agent lifecycle exists yet.
10. Stage 5 exposes unavailable adapter descriptors and contracts only; provider execution remains a Stage 6 concern.
11. Stage 6 uses a deterministic Mock adapter as the credential-free executable default and keeps real providers explicitly unavailable.
12. Stage 6 keeps invocation transient and server-side; it adds neither SQLite migration nor execution history.


## Planned Hybrid Agent Engine Boundary (Stage 12 candidate)

The 2026-09-18 LibreChat architecture harvest changes the planned implementation strategy for generic agent infrastructure without changing the implemented Stage 0–10 domain boundaries.

**Current implemented boundary:**

```text
HAN domain/application
  → AgentInvocationService
  → ProviderAdapter
  → current Mock / future provider backend
```

**Planned Stage 12 validation boundary:**

```text
HAN Experience / Domain
  → HAN Harness
  → replaceable EngineAdapter
  → LibreChatAdapter
  → self-hosted LibreChat Engine
  → model providers / MCP tools / RAG infrastructure
```

LibreChat is an engine candidate, not the HAN application shell. The following rules are architectural constraints for the prototype:

- Persistent HAN Agent identity remains separate from Provider, Model, and engine implementation.
- Task, Collaboration, Execution, Artifact, Task Report, Conversation, and Knowledge retain their existing HAN domain meanings.
- Obsidian/Markdown remains the durable external Knowledge Source of Truth. LibreChat Memory, RAG, pgvector, and search indexes are operational/retrieval layers, not replacements for that source.
- HAN application/domain code must not depend directly on LibreChat MongoDB or other internal persistence schemas.
- Engine integration should use the smallest stable API/adapter surface and remain replaceable.
- Model-provider, MCP/tool, telemetry, and other outbound data flows are governed by Stage 11 permissions/secrets/audit and an explicit data-egress policy.
- LibreChat HITL, checkpoint, background, event, skill, MCP, memory, RAG, provider, logging, and deployment primitives may be adopted where they reduce duplicated generic infrastructure, but HAN owns goals, context-loading policy, knowledge governance, evaluation, recovery policy, routing, Agent permissions, projects, Design, Activity interpretation, and product experience.
- The existing local runtime remains authoritative until the Stage 12 integration proof is implemented, verified, reviewed, and accepted. This section describes planned architecture, not current capability.

The Stage 12 proof must cover one Agent invocation, one controlled MCP/tool call, minimal HAN-controlled RAG retrieval, attributed minimum-sufficient context, local latency/token/cost telemetry, trace mapping, and documented data egress. Stage 13 then exercises recovery across that selected engine boundary.
