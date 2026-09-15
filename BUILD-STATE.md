# HAN's AI STUDIO — Build State

- **Current Version:** 0.0.0
- **Current Stage:** Stage 2 — Persistence + Workspace
- **Stage Status:** Complete — awaiting HAN's review
- **Latest Completed Stage:** Stage 2 — Persistence + Workspace
- **Latest Git Commit:** `HEAD` — Fix Stage 2 persistence mapping and test synchronization
- **Working Branch:** `main`

## What Works

- Responsive AI World Lobby and Stage 1 shell continue to render locally.
- Workspaces are created, listed, retrieved, opened, edited/renamed, closed, archived, restored, and reopened through a typed application service.
- Workspace UUID identity remains stable across rename and lifecycle changes; duplicate names are allowed.
- Workspace records persist across browser refresh and local runtime restart in SQLite at `var/studio.sqlite` by default.
- Archived Workspaces remain stored, are excluded from normal active listing, and can be viewed and restored from Home.
- The minimal Workspace view shows metadata and honest placeholders for future Chats, Tasks, Projects, Knowledge, Assets, and History.
- Persistence and validation failures surface without pretending a write succeeded.

## Incomplete Work

- Conversation and Chat persistence (Stage 3).
- Tasks, providers, agent runtime, execution, artifacts, knowledge, connectors, and all later-stage Prototype 0 features (Stages 4–14).

## Known Errors

- None.

## Tests Status

- `npm test`: passed (3 test files, 9 tests) with no React `act(...)` warnings, including domain unit tests, real isolated SQLite restart/schema mapping integration, and UI lifecycle/failure coverage.
- `npm run build`: passed (strict browser/server TypeScript checks and Vite production bundle).
- `npm run dev`: combined local runtime and Vite server started successfully; HTTP smoke check returned 200.
- Manual real-API restart verification passed: create, list, retrieve/open, stable-ID rename, close-equivalent return, archive, runtime restart, archived retrieval, restore, and active reopen.
- `npm ci`: clean lockfile install completed during Stage 0; npm audit reported 0 vulnerabilities.

## Important Decisions

- TypeScript modular monolith with React/Vite and Node.js local runtime boundaries.
- Node 24 built-in `node:sqlite` is used behind `WorkspaceRepository`; mutable data defaults to ignored `var/studio.sqlite`.
- Providers use adapters; Obsidian and external systems use connectors.
- Desktop wrapper selection remains deliberately deferred; the SQLite implementation is now fixed to Node 24's built-in API behind the repository port.
- Stage 1 uses presentational, static agent identities and locally simulated presence; these remain conceptually separate from later provider and model implementations.
- The browser calls a same-origin local `/api/workspaces` boundary and never opens SQLite or issues SQL.
- Numbered, transactional migrations are recorded in `schema_migrations`; migration 1 creates `workspaces` without destructive behavior.
- Open/close selection is transient UI navigation; the Workspace domain itself is durable. Archive is non-destructive and delete is not implemented.

## Changed Interfaces

- npm commands: `dev`, `test`, `test:watch`, `build`, `start`, `preview`.
- environment: `HAN_AI_STUDIO_DATA_DIR`; browser-safe display values may use `VITE_*`.
- runtime configuration: `HAN_AI_STUDIO_HOST`, `HAN_AI_STUDIO_PORT`, and `HAN_AI_STUDIO_DATA_DIR`.
- local HTTP API: `GET/POST /api/workspaces`, `GET/PATCH /api/workspaces/:id`, and `POST /api/workspaces/:id/archive|restore`.
- Stage 2 UI accepts Workspace name and optional description and exposes open, edit, close, archive, and restore actions.

## Uncommitted Work

- None after the Stage 2 commit.

## Blockers

- None currently known.

## Next Exact Action

HAN and architecture review Stage 2. After explicit authorization only, begin Stage 3 — Conversation + Chat by reading this file and `BUILD-PLAN.md`; do not start it automatically.

## Relevant Architecture Documents

- `docs/ARCHITECTURE.md` — authoritative Prototype 0 stack and boundaries.
- `BUILD-PLAN.md` — staged implementation roadmap.
- `AI-STUDIO.md` — historical context only.
