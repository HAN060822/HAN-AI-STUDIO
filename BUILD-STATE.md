# HAN's AI STUDIO — Build State

- **Current Version:** 0.0.0
- **Current Stage:** Stage 3 — Conversation + Chat
- **Stage Status:** Complete — awaiting HAN's review
- **Latest Completed Stage:** Stage 3 — Conversation + Chat
- **Latest Git Commit:** `HEAD` — Complete Phase 9 Stage 3 conversation and chat
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
- Tasks, Projects, Knowledge, Assets, and History remain explicit later-stage placeholders.
- Persistence and validation failures surface without pretending a write succeeded.

## Incomplete Work

- Tasks, providers, agent runtime, execution, artifacts, knowledge, connectors, and all later-stage Prototype 0 features (Stages 4–14).
- AI-generated replies, provider/model execution, task creation, message deletion, chat archive/delete, and cross-workspace move/copy are intentionally not implemented.

## Known Errors

- None.

## Tests Status

- `npm test`: passed (6 test files, 17 tests) with no React `act(...)` warnings, including domain validation/scope tests, real isolated SQLite migration/restart/schema mapping integration, HTTP API coverage, and UI reload/message-history/failure coverage.
- `npm run build`: passed (strict browser/server TypeScript checks and Vite production bundle).
- `npm run dev`: combined local runtime and Vite server started successfully; HTTP smoke check returned 200.
- Real API restart verification passed: create workspace, create/list/retrieve/rename workspace-scoped chat, append/list ordered user messages, enforce invalid/cross-workspace failures, restart the local runtime, and reopen the same persisted history.
- `npm ci`: clean lockfile install completed during Stage 0; npm audit reported 0 vulnerabilities.

## Important Decisions

- TypeScript modular monolith with React/Vite and Node.js local runtime boundaries.
- Node 24 built-in `node:sqlite` is used behind `WorkspaceRepository`; mutable data defaults to ignored `var/studio.sqlite`.
- Providers use adapters; Obsidian and external systems use connectors.
- Desktop wrapper selection remains deliberately deferred; the SQLite implementation is now fixed to Node 24's built-in API behind the repository port.
- Stage 1 uses presentational, static agent identities and locally simulated presence; these remain conceptually separate from later provider and model implementations.
- The browser calls same-origin local `/api/workspaces` and workspace-scoped conversation boundaries; it never opens SQLite or issues SQL.
- Numbered, transactional migrations are recorded in `schema_migrations`; migration 1 creates `workspaces`, and non-destructive migration 2 creates `chats` and `messages` with restrictive foreign keys and deterministic indexes.
- Open/close selection is transient UI navigation; the Workspace domain itself is durable. Archive is non-destructive and delete is not implemented.
- A Chat belongs to exactly one Workspace; a Message belongs to exactly one Chat. Database foreign keys use `ON DELETE RESTRICT`; no Stage 3 delete surface exists.
- Browser code calls only the same-origin conversation API. `ConversationService` owns validation, workspace-scope checks, UUIDs, timestamps, and human-message creation; `SqliteConversationRepository` owns SQL.

## Changed Interfaces

- npm commands: `dev`, `test`, `test:watch`, `build`, `start`, `preview`.
- environment: `HAN_AI_STUDIO_DATA_DIR`; browser-safe display values may use `VITE_*`.
- runtime configuration: `HAN_AI_STUDIO_HOST`, `HAN_AI_STUDIO_PORT`, and `HAN_AI_STUDIO_DATA_DIR`.
- local HTTP API: Stage 2 workspace endpoints plus `GET/POST /api/workspaces/:workspaceId/chats`, `GET/PATCH /api/workspaces/:workspaceId/chats/:chatId`, and `GET/POST /api/workspaces/:workspaceId/chats/:chatId/messages`.
- Stage 3 UI exposes workspace-scoped chat create/list/open/rename/back navigation and human-message create/history; it does not claim to generate an AI response.

## Uncommitted Work

- None after the Stage 3 commit.

## Blockers

- None currently known.

## Next Exact Action

HAN and architecture review Stage 3. After explicit authorization only, begin Stage 4 — Task Panel + Task State by reading this file and `BUILD-PLAN.md`; do not start it automatically.

## Relevant Architecture Documents

- `docs/ARCHITECTURE.md` — authoritative Prototype 0 stack and boundaries.
- `BUILD-PLAN.md` — staged implementation roadmap.
- `AI-STUDIO.md` — historical context only.
