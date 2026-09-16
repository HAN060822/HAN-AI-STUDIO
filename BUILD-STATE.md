# HAN's AI STUDIO — Build State

- **Current Version:** 0.0.0
- **Current Stage:** Stage 6 — Provider Integration
- **Stage Status:** Complete — awaiting HAN's review
- **Latest Completed Stage:** Stage 6 — Provider Integration
- **Latest Git Commit:** `HEAD` — Complete Phase 9 Stage 6 provider integration
- **Working Branch:** `main`

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
- A server-side Agent invocation service resolves `agent-gpt` through an explicit Mock test binding and executable deterministic Mock adapter, returning normalized Agent/Provider/Model/mode/status metadata.
- Home includes a small Prototype test invocation surface whose results are unmistakably marked `MOCK · TEST OUTPUT`; it does not mutate Chat, Task, or Agent production availability.
- Projects, Knowledge, Assets, and History remain explicit later-stage placeholders.
- Persistence and validation failures surface without pretending a write succeeded.

## Incomplete Work

- Real provider integration, orchestration, execution runtime, artifacts, knowledge, connectors, and all later-stage Prototype 0 features (Stages 7–14).
- AI-generated replies, provider/model execution, Agent assignment, message deletion, chat archive/delete, and cross-workspace move/copy are intentionally not implemented.

## Known Errors

- None.

## Tests Status

- `npm test`: passed (12 test files, 35 tests) with no React `act(...)` warnings, including deterministic Mock execution, normalized metadata, binding resolution, honest failure cases, no silent fallback, UI invocation, and all Stage 1–5 regressions.
- `npm run build`: passed (strict browser/server TypeScript checks and Vite production bundle).
- `npm run dev`: combined local runtime and Vite server started successfully; HTTP smoke check returned 200.
- Real API and 12-Task UI smoke verification passed for Workspace, Chat, Message, and Task data, including stable Task identity, active/closed classification, goal/state, and optional source Chat relation across refresh and runtime restart.
- `npm ci`: clean lockfile install completed during Stage 0; npm audit reported 0 vulnerabilities.

## Important Decisions

- TypeScript modular monolith with React/Vite and Node.js local runtime boundaries.
- Node 24 built-in `node:sqlite` is used behind `WorkspaceRepository`; mutable data defaults to ignored `var/studio.sqlite`.
- Providers use adapters; Obsidian and external systems use connectors.
- Desktop wrapper selection remains deliberately deferred; the SQLite implementation is now fixed to Node 24's built-in API behind the repository port.
- Stage 1 uses presentational, static agent identities and locally simulated presence; these remain conceptually separate from later provider and model implementations.
- The browser calls same-origin local `/api/workspaces` and workspace-scoped conversation boundaries; it never opens SQLite or issues SQL.
- Numbered, transactional migrations are recorded in `schema_migrations`; non-destructive Migration 3 adds `tasks` with restrictive Workspace and optional Chat foreign keys and deterministic indexes.
- Open/close selection is transient UI navigation; the Workspace domain itself is durable. Archive is non-destructive and delete is not implemented.
- A Chat belongs to exactly one Workspace; a Message belongs to exactly one Chat. Database foreign keys use `ON DELETE RESTRICT`; no Stage 3 delete surface exists.
- Browser code calls only the same-origin conversation API. `ConversationService` owns validation, workspace-scope checks, UUIDs, timestamps, and human-message creation; `SqliteConversationRepository` owns SQL.
- Task is a separate domain and is not an Execution. `TaskService` owns validation, cross-Workspace protection, IDs, timestamps, and lifecycle transitions; `SqliteTaskRepository` owns Task SQL.
- The honest Stage 4 Task states are Draft, Discussing, Paused, Blocked, Completed, and Cancelled. Completed and Cancelled are terminal; no status implies runtime activity.
- **DATA RETENTION ≠ ACTIVE UI PRESENCE:** completed and cancelled Tasks remain authoritative SQLite records but are excluded from the default Active presentation and available in Closed.
- **TASK LIST = NAVIGATION, TASK DETAIL = INFORMATION:** collection rows expose compact identity/status context; goal, lifecycle actions, and complete metadata remain in the opened Task detail.
- Task archive and hard delete are explicitly deferred. Cancel is not delete, terminal Tasks are retained, and no destructive cascade behavior is introduced.
- **AGENT ≠ PROVIDER ≠ MODEL:** an AI Studio Agent is persistent identity; its Provider and Model are replaceable binding metadata.
- **PERSISTENT IDENTITY + REPLACEABLE INTELLIGENCE BACKEND:** Agent IDs remain stable when a future binding changes.
- **CAPABILITY ≠ PERSONALITY** and **ROLE ≠ IDENTITY:** capabilities and role summaries are provisional, machine-readable participation hints, not personas or permissions.
- **NORMALIZE COMMON, PRESERVE UNIQUE:** the adapter contract normalizes identity, availability, text request, and response fields while generic extension types leave provider-specific behavior behind adapters.
- **NO FAKE ACTIVITY:** initial Agents and adapter descriptors are unavailable/unconfigured; Stage 5 performs no inference and presents no simulated execution state.
- GPT, Gemini, and Codex are global application-defined Agents rather than per-Workspace SQLite rows. User-created Agents and persistent Agent configuration are deferred.
- Capability metadata describes potential fit only. It grants no connection, permission, approval, or autonomy.
- **Mock Provider ≠ Fake Agent:** `agent-gpt` keeps its stable identity and production binding while the server applies an explicit test-only Mock binding.
- **Provider Connectivity ≠ Agent Permission:** successful Mock invocation grants no terminal, repository, filesystem, external-action, or autonomous Task authority.
- **UI → Application → Adapter → Provider:** React calls only the same-origin API; `AgentInvocationService` owns resolution and validation behind the server boundary.
- **FAIL HONESTLY** and **NO SILENT FALLBACK:** unknown/unavailable/unconfigured/malformed/failed cases return safe normalized errors; real configuration never silently substitutes Mock.

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

## Uncommitted Work

- None after the Stage 4 commit.

## Blockers

- None currently known.

## Next Exact Action

HAN and architecture review Stage 6. After explicit authorization only, begin Stage 7 — Orchestrator + Collaboration by reading this file and `BUILD-PLAN.md`; do not start it automatically.

## Relevant Architecture Documents

- `docs/ARCHITECTURE.md` — authoritative Prototype 0 stack and boundaries.
- `BUILD-PLAN.md` — staged implementation roadmap.
- `AI-STUDIO.md` — historical context only.

## Stage Gate

- **Current Stage:** Stage 6 — Provider Integration
- **Stage Status:** Complete
- **Stage 7:** NOT started
