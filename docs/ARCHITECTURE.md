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

Stages 2–4 exercise `core/workspaces`, `core/conversations`, and `core/tasks`, matching application ports/services, SQLite repositories, and local server routes while keeping browser presentation and typed API clients in `src/app`. Cohesive `agents`, `orchestrator`, `execution`, `context`, `knowledge`, `permissions`, `observability`, `adapters`, and `connectors` modules are added when first used. This reserves boundaries without empty architecture scaffolding.

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

Node's built-in SQLite API was selected over an ORM or native package because Node 24 is the repository baseline, it introduces no new dependency or compilation step, and the repository interface keeps the implementation replaceable.

## Stage 0 decisions

1. Use one TypeScript package while Prototype 0 remains a modular monolith.
2. Use React/Vite without a full-stack meta-framework so local runtime boundaries remain explicit.
3. Defer the SQLite library choice to Stage 2, when runtime and packaging constraints can be tested together.
4. Defer the desktop wrapper choice until validated workflows expose required native capabilities.
5. Add dependencies and modules only when a vertical stage exercises them.
6. Stage 3 keeps conversation persistence deliberately local and provider-free: no AI response is fabricated when a user sends a message.
7. Stage 4 keeps Task lifecycle separate from Chat and future Execution; changing Task state never claims that AI work is running.
