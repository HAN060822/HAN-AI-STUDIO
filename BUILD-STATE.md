# HAN's AI STUDIO — Build State

- **Current Version:** 0.0.0
- **Current Stage:** Stage 1 — Application Shell + Home
- **Stage Status:** Complete — awaiting HAN's review
- **Latest Completed Stage:** Stage 1 — Application Shell + Home
- **Latest Git Commit:** `HEAD` — Complete Phase 9 Stage 1 application shell and home
- **Working Branch:** `main`

## What Works

- Responsive AI World Lobby and persistent application shell render locally.
- Home presents primary navigation, GPT/Gemini/Codex presence, a global intent preview, workspace entry, attention, and active-work areas.
- Workspace creation is a tested, temporary in-memory UI interaction and labels its reset-on-reload behavior.
- Unfinished navigation, intent execution, runtime, and work features are represented honestly.
- Development, test, production build, and preview commands are defined with strict TypeScript and safe local environment/data separation.

## Incomplete Work

- Durable workspace persistence and lifecycle (Stage 2).
- Conversations, tasks, providers, agents runtime, execution, artifacts, knowledge, connectors, and all later-stage Prototype 0 features (Stages 3–14).

## Known Errors

- None.

## Tests Status

- `npm test`: passed (1 test file, 4 tests) after adding behavior coverage for the lobby shell, agent identities, disabled navigation, intent honesty, temporary workspace creation, and empty states.
- `npm run build`: passed (TypeScript build and Vite production bundle).
- `npm run dev`: started successfully; HTTP smoke check returned 200 with expected root and title.
- `npm ci`: clean lockfile install completed during Stage 0; npm audit reported 0 vulnerabilities.

## Important Decisions

- TypeScript modular monolith with React/Vite and Node.js local runtime boundaries.
- SQLite behind repository ports begins in Stage 2; mutable data defaults to ignored `var/`.
- Providers use adapters; Obsidian and external systems use connectors.
- Desktop wrapper and SQLite library selections are deliberately deferred.
- Stage 1 uses presentational, static agent identities and locally simulated presence; these remain conceptually separate from later provider and model implementations.
- Temporary workspace UI state remains in React memory only; no persistence or Stage 2 storage interface was added.

## Changed Interfaces

- npm commands: `dev`, `test`, `test:watch`, `build`, `preview`.
- environment: `HAN_AI_STUDIO_DATA_DIR`; browser-safe display values may use `VITE_*`.
- Stage 1 user-facing interaction: temporary workspace name creation and non-executing global intent preview.

## Uncommitted Work

- None after the Stage 1 commit.

## Blockers

- None currently known.

## Next Exact Action

HAN and architecture review Stage 1. After explicit authorization only, begin Stage 2 — Persistence + Workspace by reading this file and `BUILD-PLAN.md`; do not start it automatically.

## Relevant Architecture Documents

- `docs/ARCHITECTURE.md` — authoritative Prototype 0 stack and boundaries.
- `BUILD-PLAN.md` — staged implementation roadmap.
- `AI-STUDIO.md` — historical context only.
