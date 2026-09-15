# HAN's AI STUDIO

Local-first personal multi-agent AI workspace. The repository is being built vertically, one reviewed stage at a time.

## Current status

Phase 9 / Stage 0 establishes the repository and environment baseline. Product functionality begins in Stage 1.

## Prerequisites

- Node.js 24 LTS-compatible runtime (the baseline was verified with Node.js 24.21.0)
- npm 11 or newer

## Commands

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

`npm run dev` starts the local development server. `npm run preview` serves the production build locally after `npm run build`.

## Repository layout

- `src/app/` — web application composition and presentation
- `src/core/` — dependency-free domain-facing code and future ports
- `tests/` — automated tests
- `docs/` — architecture and implementation decisions
- `var/` — ignored local runtime data (databases, artifacts, checkpoints, logs)
- `BUILD-PLAN.md` — staged implementation roadmap
- `BUILD-STATE.md` — authoritative handoff state between Builder sessions
- `AI-STUDIO.md` — historical research record, not the current MVP specification

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the selected stack and boundaries.

## Environment

Copy `.env.example` to `.env.local` for local overrides. Do not commit `.env.local`, credentials, provider keys, databases, or runtime artifacts. Browser-exposed variables must start with `VITE_` and must never contain secrets.
