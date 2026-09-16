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

## Stage 0 decisions

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
