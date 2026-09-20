# HAN's AI STUDIO

Local-first personal multi-agent AI workspace. The repository is being built vertically, one reviewed stage at a time.

## Current status

Phase 9 / Stage 13 integrates and verifies the existing Stage 0–12 closed loop across refresh, server restart and failure boundaries. Narrow repairs add retry-safe Artifact preservation, truthful repeat-save audit evidence and explicit invalid-checkpoint rejection. Stage 13 is builder-complete, awaiting Architect review and HAN acceptance; NOT PUSHED, NOT SEALED. Stages 0–12 are sealed; Stage 14 has not started. No real provider, Builder Harness or engine change is included.

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

## Integration & recovery

Use a Workspace → Task → Prototype Execution with the default pause-after-step option. After the first contribution, refresh/reopen the Workspace or restart the server; Resume continues only the next incomplete step. Completed/cancelled/failed/interrupted attempts do not resume. An uncertain in-flight call found after restart becomes Interrupted, never silently replayed. Inconsistent checkpoints fail explicitly rather than displaying invented progress.

Use **Refresh Outcomes** to load completed contributions, deliberately preserve an Artifact and generate the Task Report; **Refresh Knowledge** then loads those formal sources for review. An uncertain Artifact response retains one creation identity for an unchanged in-panel retry. Full page reload does not replay a request or retain the draft: inspect the fetched outcomes before starting a new intent. Reports retain one current identity per Task. Already-saved Knowledge retries verify the note and record `not_executed / already_saved_verified`, not another publication success; fresh reviewed authority is still required. Read-only Verify creates no audit event and never overwrites an edited note.

See [Stage 13 verification](docs/STAGE-13-VERIFICATION.md) for the closed-loop tests, isolated-vault browser procedure, actual refresh/restart evidence, exact disposable note path and uncertainty limits. Development HMR shares the configured HTTP port, so isolated instances do not compete for a separate default HMR port. Continue to use one server per database.

## Context & Usage

Open a Workspace → create/start a Mock-backed Execution → open **Advanced: Context & Usage** in its detail. With the default pause-after-step demo, inspect the first contribution, Resume, then inspect the completed run. The collapsed panel loads metadata on demand and survives reload/restart through local SQLite telemetry.

Only the explicit goal/instruction and immediate bounded prior contribution are supplied. Workspace/Task/Execution scope is reference-only; no Chat history, Knowledge, vault, Audit or Secret store is automatically loaded. Character/byte counts are not provider tokens. Mock token counters are conspicuously **synthetic, not billing**; unavailable usage and cost stay unknown. Telemetry and authority Audit remain separate.

Execution telemetry appends start/final evidence. Failure to store start evidence prevents that provider call; finalization failure retains successful output and reports unconfirmed telemetry, never automatic replay. Standalone Home invocation/collaboration measurements remain transient. Historical runs are not backfilled. See [Stage 12 verification](docs/STAGE-12-VERIFICATION.md) for contracts, failure limits and the exact browser smoke.

## Reviewed Knowledge / Obsidian

Set `HAN_AI_STUDIO_OBSIDIAN_VAULT` to an **existing absolute vault path** containing `.obsidian`, using the process environment or ignored `.env.local`. Restart the server after configuration or application-service/connector changes. The Node entry point loads `.env.local` before reading configuration; existing process environment values take precedence. Neither the library server factory nor automated tests load this file.

Open a Workspace → **Reviewed Knowledge** → select Artifact / Task Report / Manual Knowledge → **Prepare for Review**. Preparing persists only a candidate in SQLite. Review the Markdown, vault, and relative path; check approval and select **Save Reviewed Knowledge**. **Verify Saved Note** reads and compares the existing Markdown. With no configured vault, candidates remain available and the UI explains why Save is unavailable.

The only generated-note destination is `Knowledge/AI-Studio-Generated/` inside the configured vault. Names combine a sanitized title and stable Knowledge UUID. Repeat saves verify the same note; differing existing notes are never replaced. Explicitly preparing another candidate creates another identity. There is no automatic export, edit/delete, background retry or bidirectional sync. Use one local server per database; Stage 11 enforces loopback-only binding, not multi-user authentication.

See [Stage 10 verification](docs/STAGE-10-VERIFICATION.md) for configuration, failure/retry behavior, browser evidence, and the exact disposable real-vault smoke note.

## Prototype governance

`HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION=review` (default) grants only the trusted local owner reviewed Knowledge publication. `deny`, or any unrecognized value, blocks publication. Restart after changing policy. Agents and runtime have no external-publication or secret-use grants. A configured connector or Secret reference grants no authority.

The existing review checkbox covers both reviewed content and authority for this exact destination and one attempt. The server checks the current preview, local request context, explicit permission and approval; React is not the authority. A fresh process-local CSRF token accompanies Save. This assumes trusted local code and one owner, not an identity/login platform.

Open **Advanced: authority, audit & Secret references** in Knowledge review for recent metadata-only attempt history and configured/unavailable Secret references. Pre-action audit failure prevents publication. If final audit cannot be confirmed, the UI reports uncertainty: inspect the retained record and use read-only Verify before any fresh reviewed retry. Nothing is replayed automatically.

Optional server-only mappings are `HAN_AI_STUDIO_SECRET_OPENAI`, `HAN_AI_STUDIO_SECRET_GEMINI`, `HAN_AI_STUDIO_SECRET_GITHUB` and `HAN_AI_STUDIO_SECRET_ENGINE`. Do not add real keys for Stage 11. No real provider, engine, MCP tool or network egress is connected or authorized. The environment-backed Secret provider exposes status and a trusted synchronous server-consumer seam, never a value API.

See [Stage 11 verification](docs/STAGE-11-VERIFICATION.md) for contracts, exact enforcement scope, tests, isolated-vault browser smoke, failure policy and review points. Stage 1–10 internal/Mock actions are not all retrofitted with governance; this is not a universal application sandbox.

## Environment

Copy `.env.example` to `.env.local` for local overrides. Do not commit `.env.local`, credentials, provider keys, databases, or runtime artifacts. Browser-exposed variables must start with `VITE_` and must never contain secrets.
