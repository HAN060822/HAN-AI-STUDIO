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

The earlier LibreChat/EngineAdapter/MCP/RAG proof in `docs/STAGE-12-ENGINE-INTEGRATION.md` is retained as deferred planning, not a requirement or completed capability of this authorized stage. No engine adoption/rejection decision or Builder Harness change is implied. Stages 12 and 13 are sealed per HAN; Stage 14 below follows its separately authorized current handoff.

## Stage 13 — End-to-End Integration & Recovery

Integrate the existing Workspace/Chat/Task → Agent/Orchestrator/Execution → Context/Mock/Telemetry → Artifact/Task Report → Knowledge → approval/permission/audit → Obsidian/verification path. Prove refresh, paused resume, restart continuity, terminal-state retention, useful-work preservation and truthful uncertainty. Repair only observed retry/recovery gaps; preserve sealed Stage 0–12 contracts. No engine/MCP/RAG, real provider, new workflow engine, migration-backup system or Stage 14 UX redesign. **Exit:** focused/full tests, production build, browser closed loop, full server-restart verification, diff checks and documentation pass; one local commit; stop for review without pushing. Evidence: `docs/STAGE-13-VERIFICATION.md`.

## Stage 14 — Prototype 0 Release Candidate

HAN's current Stage 14 handoff authorizes whole-system acceptance of sealed Stage 0–13, truthful UX cleanup, Normal versus Advanced/Inspect separation, removal or repair of disconnected navigation/Continue Active Work/placeholders, and fewer normal-path decisions. Preserve architecture, permissions/approval/audit, data, context/telemetry, idempotency and recovery. **Exit:** full regression, production build, real-browser acceptance, refresh/restart verification, scoped diff/privacy checks, updated BUILD-STATE and `docs/STAGE-14-VERIFICATION.md`, and one local commit; stop for review without pushing.

This supersedes the historical Stage 14 engine/deployment/tagging experiment. No engine/provider integration, Ponytail, Jev, Builder Harness change, desktop wrapper, backup system, release tag or post-Prototype-0 feature is authorized or claimed. Release-candidate builder completion is not Architect/HAN acceptance or sealing.
