# HAN's AI STUDIO

Local-first personal multi-agent AI workspace. The repository is being built vertically, one reviewed stage at a time.

## Current status

Phase 9 / Stage 8 adds durable Execution attempts with safe-boundary pause/resume/cancel controls above the existing Mock-backed collaboration layer. Workspace, human Chat, and Task planning remain separate persistent domains. Stage 8 is awaiting independent review; Stage 9 has not started.

## Prerequisites

- Node.js 24 LTS-compatible runtime (the baseline was verified with Node.js 24.21.0)
- npm 11 or newer

## Commands

```bash
npm ci
npm run dev
npm test
npm run build
npm start
npm run preview
```

`npm run dev` starts the combined local API and Vite development server. `npm start` (or `npm run preview`) serves the production build and local API after `npm run build`.

## Repository layout

- `src/app/` — web application composition and presentation
- `src/core/` — introduced with the first dependency-free domain-facing use case
- `tests/` — automated tests
- `docs/` — architecture and implementation decisions
- `var/` — ignored local runtime data (databases, artifacts, checkpoints, logs)
- `BUILD-PLAN.md` — staged implementation roadmap
- `BUILD-STATE.md` — authoritative handoff state between Builder sessions
- `AI-STUDIO.md` — historical research record, not the current MVP specification

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the selected stack and boundaries.

## Workspace persistence

Workspaces are stored in `var/studio.sqlite` by default. Set `HAN_AI_STUDIO_DATA_DIR` to use a different local data directory. SQLite files and sidecars are ignored by Git. Workspace names do not act as identity; stable UUIDs survive rename, archive, restore, refresh, and runtime restart.

GPT and Gemini have explicit deterministic Mock test bindings; real providers remain disconnected. Open a Workspace to use Prototype Executions. See [Stage 8 verification](docs/STAGE-8-VERIFICATION.md) for the hands-on procedure and truthful control/recovery limitations. The global intent form remains an interface preview; artifacts, knowledge, and connectors are not implemented.

## Environment

Copy `.env.example` to `.env.local` for local overrides. Do not commit `.env.local`, credentials, provider keys, databases, or runtime artifacts. Browser-exposed variables must start with `VITE_` and must never contain secrets.
