# Stage 12 — Context, Telemetry & Engine Integration

**Status:** Planned specification — do not start until Stage 11 is sealed or HAN explicitly changes sequencing.  
**Architecture direction:** Hybrid Agent Engine  
**Engine candidate:** LibreChat, self-hosted and replaceable  
**Harvest revision:** `12d78909d3f5247a8d40a47f0ef5c3ac771d9c5a`  
**Harvest date:** 2026-09-18  
**License observed in harvest:** MIT

## Objective

Stage 12 preserves the existing roadmap requirement for budgeted, attributed minimum-sufficient context and local latency/token/cost telemetry, and adds a bounded engine-integration proof.

The question is not whether HAN's AI STUDIO can become a LibreChat fork. The question is whether the existing HAN-owned domain and Harness boundaries can use LibreChat as a replaceable self-hosted Agent Engine while preserving control, knowledge ownership, traceability, privacy, and recovery semantics.

## Preconditions

- Stage 11 permissions, secrets, approvals, audit, redaction, and data-egress boundaries are sealed, unless HAN explicitly approves a sequencing change.
- The latest independently sealed baseline is known and recoverable.
- Repository status, branch, and exact HEAD are inspected before implementation.
- LibreChat upstream revision and license are pinned and recorded.
- Integration work is isolated from the stable baseline.

## Architecture Under Test

```text
HAN Experience / Domain
        ↓
HAN Harness
        ↓
EngineAdapter
        ↓
LibreChatAdapter
        ↓
Self-hosted LibreChat Engine
   ┌────┼──────────┐
   ↓    ↓          ↓
 Agent  MCP        RAG
             ↓
 Providers / Tools / Retrieval
```

Existing HAN concepts remain authoritative:

```text
Agent ≠ Provider ≠ Model
Task ≠ Collaboration ≠ Execution
Execution output ≠ Artifact ≠ Task Report
Conversation ≠ Knowledge
Obsidian = durable external Knowledge Source of Truth
```

## Non-Goals

Stage 12 does not implement the full Design Workspace, major UI redesign, 3D Lobby, autonomous scheduler, recurring/overnight/24/7 operation, production cloud scale, broad multi-user administration, Physical AI, or a large-scale LibreChat source fork.

Do not index the full Obsidian Vault for the first RAG proof.

## Work Packages

### 12.0 — Verify Stage 11 Sealed Baseline

Record:

- `git status`
- current branch
- exact HEAD
- latest sealed stage/commit
- test/build status
- existing architecture/configuration relevant to engine integration

**Exit:** implementation starts from an explicit recoverable baseline.

### 12.1 — Pin LibreChat Provenance

Record the upstream repository, exact revision, license, integration date, and whether any source is copied or modified.

Prefer API/infrastructure use over source copying.

**Exit:** engine provenance is reproducible.

### 12.2 — Start Isolated Local LibreChat Stack

Use the smallest local deployment needed for the proof. Expected infrastructure may include LibreChat API, MongoDB, MeiliSearch, pgvector, and RAG API where required.

Do not make HAN depend directly on LibreChat internal persistence schemas.

**Exit:** local engine health is observable and independent from the HAN baseline.

### 12.3 — Implement HAN Engine Adapter / LibreChat Adapter

Preserve the existing provider boundary while introducing the smallest replaceable engine seam required by the proof.

Conceptually:

```text
HAN application
 → EngineAdapter
 → LibreChatAdapter
 → LibreChat API
```

The rest of HAN must not need LibreChat implementation knowledge.

**Exit:** adapter health/invocation contracts are testable without leaking engine internals into UI/domain code.

### 12.4 — Test One Agent Invocation

Execute one bounded Agent request through the HAN adapter and capture Agent/Provider/Model/engine attribution, result, safe error behavior, and trace evidence.

**Exit:** HAN → Adapter → LibreChat → Agent → response succeeds or fails with attributable evidence.

### 12.5 — Test One Controlled MCP / Tool Call

Use one safe, non-destructive test tool under Stage 11 permission/approval rules.

Inspect tool identity, requested action, permission/approval state, input/output, failure behavior, and audit/trace evidence.

**Exit:** a controlled tool action can be explained from request through result.

### 12.6 — Test Minimal HAN-Controlled RAG Retrieval

Use a small disposable/test Markdown knowledge set rather than the full Vault.

```text
HAN test knowledge
 → Knowledge/RAG adapter
 → retrieval/index
 → relevant chunk
 → Agent context
```

Record source/provenance and verify that the retrieval index remains derivative/rebuildable.

**Exit:** known information is retrieved correctly without redefining RAG as the Knowledge Source of Truth.

### 12.7 — Minimum-Sufficient Attributed Context

Implement the original Stage 12 context requirement across the engine boundary.

Context must be:

- explicitly sourced;
- attributable;
- bounded by budget;
- minimum sufficient for the task;
- separate from hidden reasoning;
- governed by Workspace/Task/Agent/Knowledge scope;
- inspectable without logging sensitive content unnecessarily.

**Exit:** HAN can explain what context categories were supplied and why.

### 12.8 — Local Usage Telemetry

Implement the original Stage 12 observability requirement for latency/token/cost or honest unavailable values.

Telemetry must preserve Agent/Provider/Model/engine attribution and avoid leaking prompt/knowledge content.

**Exit:** provider/engine usage is inspectable locally without pretending unavailable measurements exist.

### 12.9 — Trace / Activity Mapping

Map engine-visible events into HAN concepts without importing coordination noise or hidden reasoning.

At minimum inspect:

- Agent run
- provider/model attribution
- MCP/tool call
- RAG retrieval
- error/failure
- checkpoint/resume/event information where actually exposed

**Exit:** define which engine data can later feed HAN's Activity/Trace experience.

### 12.10 — Privacy / Data-Egress Verification

Classify each connection:

```text
LOCAL
EXPLICITLY ALLOWED
OPTIONAL
DISABLED
UNKNOWN
```

Verify unnecessary external telemetry is disabled. Document model-provider and MCP/tool traffic separately from local self-hosting.

**Exit:** HAN can explain what data leaves the machine and under which authority.

### 12.11 — Failure and Coupling Tests

Test representative failure cases without large workaround code:

- LibreChat unavailable
- provider unavailable/failure
- MCP/tool denial/failure
- RAG unavailable/failure
- malformed engine response
- persistence/trace failure where practical

Evaluate dependencies on LibreChat API contracts, internal database schemas, source modules, filesystem assumptions, provider implementation, and RAG implementation.

**Exit:** failures are attributable and the integration remains narrow enough to replace.

### 12.12 — Verification Report

Create `docs/STAGE-12-VERIFICATION.md` only when implementation evidence exists.

Report:

- what worked;
- what failed;
- tests/build;
- architecture/coupling findings;
- privacy/egress findings;
- maintenance cost;
- limitations;
- exact human verification path;
- recommendation: adopt, narrow, redesign, or reject the engine integration.

### 12.13 — Architect Review + HAN Acceptance

No merge/seal claim is automatic.

## Merge / Seal Gate

- [ ] Stage 11 prerequisite satisfied or sequencing exception explicitly recorded.
- [ ] LibreChat revision pinned.
- [ ] License/attribution requirements recorded.
- [ ] Stable baseline recoverable.
- [ ] Integration isolated during implementation.
- [ ] Agent invocation proof completed.
- [ ] Controlled MCP/tool proof completed.
- [ ] Minimal RAG proof completed.
- [ ] Context is budgeted and attributable.
- [ ] Local usage telemetry is honest and inspectable.
- [ ] Trace/activity mapping documented.
- [ ] Data egress documented.
- [ ] Unnecessary external telemetry disabled.
- [ ] No unnecessary direct LibreChat MongoDB/internal-schema dependency.
- [ ] Engine adapter remains replaceable.
- [ ] Representative failures are attributable.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `git diff --check` passes.
- [ ] Architect review passes.
- [ ] HAN explicitly accepts/seals the stage.

## Stage 12 Exit Question

Stage 12 is successful only if evidence supports:

> HAN's AI STUDIO can use the selected LibreChat engine boundary while preserving HAN-owned Agent identity, domain semantics, knowledge ownership, permission/approval policy, context governance, observability, and replaceability.

A valid Stage 12 result may also be **reject / redesign / narrow**. Failure to adopt LibreChat is not a failed experiment if the evidence protects the architecture.

## Handoff to Stage 13

If accepted, Stage 13 exercises the complete loop and recovery behavior across the selected boundary:

```text
Task
 → context loading
 → Agent / engine
 → MCP or RAG where required
 → Execution
 → Artifact / Task Report
 → reviewed Knowledge
 → restart/failure
 → recovery and verification
```

Stage 13 must preserve committed useful work and avoid silent replay of uncertain external actions.
