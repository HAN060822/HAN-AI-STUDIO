# HAN's AI STUDIO — Prototype 0 Build Plan

This traceable plan may evolve, but changes must be explained in `BUILD-STATE.md` and Git history. Every stage ends with verified software, updated state, and one coherent commit.

## Stage 0 — Repository & Environment Baseline

Select and document the stack; bootstrap web, test, build, environment, data-separation, and continuity baselines. **Exit:** local start, tests, and build pass; Stage 1 is next.

## Stage 1 — Application Shell + Home

Build durable layout, navigation, Home route, accessible UI primitives, visual tokens, error boundary, routing, and honest recent-work empty state. **Exit:** responsive shell and component tests pass.

## Stage 2 — Persistence + Workspace

Select SQLite driver; add migrations, repository ports, database lifecycle, and workspace create/list/open/update. **Exit:** workspaces survive restart without UI/database coupling.

## Stage 3 — Conversation + Chat

Model conversations and ordered messages independently of tasks; add workspace-scoped creation, reopening, persistence, and chat UI. **Exit:** conversations survive restart and continue.

## Stage 4 — Task Panel + Task State

Model task intent, lifecycle, and links; add task creation, visible states, transitions, and validation. **Exit:** tasks are reopenable and tracked without conflating execution.

## Stage 5 — Agent Registry + Adapter Interface

Separate agents, providers, and models; add registry, capabilities, configuration, provider port, and deterministic fakes. **Exit:** agent resolution does not import provider SDKs into domain/UI.

## Stage 6 — Real/Mock Provider Integration

Keep mock as the no-credential default; add one configured real adapter, server-side secrets, timeouts, and normalized errors. **Exit:** one use case runs through either adapter; tests need no network.

## Stage 7 — Orchestrator + Collaboration

Add bounded roles, turn routing, shared task context, stop criteria, persisted decisions, and visible progress. **Exit:** small multi-agent tasks terminate deterministically.

## Stage 8 — Execution Runtime + Human Controls

Separate executions from tasks; add lifecycle, checkpoints, events, and intervene/pause/cancel controls while preserving completed work. **Exit:** execution is observable, controllable, and restart-aware.

## Stage 9 — Artifact + Task Report

Store artifact metadata with filesystem content/provenance and produce structured reports for results, decisions, errors, and outputs. **Exit:** completed or interrupted work retains usable artifacts and reports.

## Stage 10 — Knowledge Interface + Obsidian Connector

Add approved-knowledge records and connector ports; implement preview/approve/export plus path-safe, idempotent Obsidian filesystem export. **Exit:** only approved knowledge exports through the connector.

## Stage 11 — Permissions + Secrets + Audit

Add explicit capabilities, local secret references, approvals, audit events, and redaction. Define the security boundary for later engine integration: HAN-to-engine credentials, model-provider/API secret ownership, MCP/tool permissions, local-first data-egress policy, and Human Director approval mapping. **Exit:** privileged actions are attributable and denied unless granted; future engine/tool connections have an explicit permission, secret, approval, and egress boundary.

## Stage 12 — Context + Usage Telemetry

HAN's current Stage 12 Builder Handoff narrows this gate to the existing Mock-backed Execution → Orchestrator → Agent → Provider path: explicit bounded Context packages, metadata-only provenance, normalized honest usage, monotonic duration and append-oriented local telemetry. Unknown usage/cost remains unknown; no automatic Chat/Knowledge/vault loading. **Exit:** actual execution context and usage are inspectable after reload/restart, failures remain truthful, all Stage 1–11 regressions pass, and Architect/HAN review accepts the stage.

The earlier LibreChat/EngineAdapter/MCP/RAG proof in `docs/STAGE-12-ENGINE-INTEGRATION.md` is retained as deferred planning, not a requirement or completed capability of this authorized stage. No engine adoption/rejection decision, Builder Harness change or later-stage work is implied. Stages 13–14 below remain historical roadmap candidates requiring their own current handoffs; Stage 13 is NOT STARTED.

## Stage 13 — End-to-End Integration & Recovery

Exercise the complete loop across the selected engine boundary; add restart/crash recovery, migration backup, corrupt-state handling, cancellation preservation, engine/provider/MCP/RAG failure handling, and E2E tests. Preserve useful committed work and avoid silent replay of uncertain external actions. **Exit:** main and recovery paths pass from clean and existing data, including bounded engine failure cases.

## Stage 14 — Prototype 0 Release Candidate

Freeze scope; audit accessibility, privacy, dependencies, docs, install/update/backup flows, and release artifacts. If LibreChat remains selected, pin and document its version/license, reproduce the local deployment, verify data-egress/telemetry defaults, review dependency/security/update procedure, and confirm the engine remains replaceable. Reassess desktop wrapper using validated needs. **Exit:** reproducible tagged candidate with limitations and acceptance record.
