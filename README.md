# HAN's AI STUDIO

Local-first personal multi-agent AI workspace. The repository is being built vertically, one reviewed stage at a time.

## Current status

Phase 9 / Stage 10 adds reviewed Knowledge and a narrow Obsidian Markdown connector above sealed Stage 9. Artifact, Task Report, and manual candidates remain local until HAN reviews the content/destination and explicitly approves Save. Stage 10 is builder-complete and awaiting independent review; Stage 11 has not started.

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

GPT and Gemini have explicit deterministic Mock test bindings; real providers remain disconnected. Open a Workspace to use Prototype Executions and preserve committed contributions as formal text Artifacts. See [Stage 9 verification](docs/STAGE-9-VERIFICATION.md) for the outcome loop and [Stage 8 verification](docs/STAGE-8-VERIFICATION.md) for control/recovery limits. The global intent form remains an interface preview.

## Reviewed Knowledge / Obsidian

Set `HAN_AI_STUDIO_OBSIDIAN_VAULT` to an **existing absolute vault path** containing `.obsidian`, using the process environment or ignored `.env.local`. Restart the server after configuration or application-service/connector changes. The Node entry point loads `.env.local` before reading configuration; existing process environment values take precedence. Neither the library server factory nor automated tests load this file.

Open a Workspace → **Reviewed Knowledge** → select Artifact / Task Report / Manual Knowledge → **Prepare for Review**. Preparing persists only a candidate in SQLite. Review the Markdown, vault, and relative path; check approval and select **Save Reviewed Knowledge**. **Verify Saved Note** reads and compares the existing Markdown. With no configured vault, candidates remain available and the UI explains why Save is unavailable.

The only generated-note destination is `Knowledge/AI-Studio-Generated/` inside the configured vault. Names combine a sanitized title and stable Knowledge UUID. Repeat saves verify the same note; differing existing notes are never replaced. Explicitly preparing another candidate creates another identity. There is no automatic export, edit/delete, background retry or bidirectional sync. Use one local server per database and keep the runtime bound to loopback; Stage 10 is not a permission engine.

See [Stage 10 verification](docs/STAGE-10-VERIFICATION.md) for configuration, failure/retry behavior, browser evidence, and the exact disposable real-vault smoke note.

## Environment

Copy `.env.example` to `.env.local` for local overrides. Do not commit `.env.local`, credentials, provider keys, databases, or runtime artifacts. Browser-exposed variables must start with `VITE_` and must never contain secrets.
