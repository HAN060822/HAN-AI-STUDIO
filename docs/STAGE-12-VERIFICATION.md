# Stage 12 — Context + Usage Telemetry verification

## Scope and baseline

Builder complete; awaiting Architect review and HAN acceptance. NOT PUSHED, NOT SEALED. STAGE 13 NOT STARTED.

Baseline: `4c7afe677450900d02525823978ffbc60776a35c` (`Complete Phase 9 Stage 11 permissions secrets and audit`), clean synchronized `main`/`origin/main` before Stage 12. HAN's handoff declares Stages 0–11 complete, pushed and sealed. Work resumed from the existing Stage 12 implementation without resetting or replacing completed work.

Final local commit: `HEAD`, message `Complete Phase 9 Stage 12 context and usage telemetry`; use `git rev-parse HEAD` for the exact self-referential hash. The final Builder Report records that hash and full diff statistics.

The current handoff narrows Stage 12 to Context + Usage on the existing Mock path. The earlier LibreChat/EngineAdapter/MCP/RAG document remains historical deferred planning, not a current acceptance gate. No Ponytail, Builder Harness modification, engine/provisioning work, new provider/credential/dependency, or Stage 13 work is included.

## Executable contracts

The existing path is preserved:

```text
Execution (persisted authoritative scope)
  → LocalExecutionRuntime → Orchestrator
  → Context assembler (same bounded supplied text as Stage 7)
  → AgentInvocationService → existing ProviderAdapter
  → normalized usage + metadata-only telemetry repository
  → Execution checkpoint + collapsed Context & Usage inspection
```

### Context, provenance and bounds

- `ContextPackage`: transient `input` plus `ContextSnapshot`; the snapshot, not input text, is persisted in telemetry.
- Snapshot: UUID, schema version, Workspace/optional Task/Execution/step scope, items, omissions, UTF-16 character count, UTF-8 byte count, SHA-256 input fingerprint and 2,000-character maximum.
- Item: kind, source type, source ID/step where available, fixed inclusion reason, supplied/reference-only delivery, original/supplied counts and truthful truncation flag.
- Existing immutable Execution goal ≤500 characters; immediate prior contribution ≤800; handoff next-action ≤180; final supplied input ≤2,000; at most 6 items and 8 fixed omission labels. The input total includes formatting/Agent attribution, not just the sum of item content sizes.
- Goal points to the Execution snapshot. Handoff points to its source Execution/step. Workspace, optional Task and Execution are references only; their full contents and identifiers are not automatically appended to provider text. Direct/standalone request source IDs can be null.
- Oversize/invalid goal or input is rejected; handoff truncation retains original size and indicates what was supplied. First-step previous contribution is explicitly unavailable. No automatic Chat/Knowledge/vault/unrelated Task/Secret/hidden-reasoning/Audit injection.
- Client-added context/scope/history fields are not an authority to load data. The runtime supplies stored scope and the repository checks Execution ownership, Task linkage and step/Agent association. Wrong-Workspace inspection is rejected.
- This formalizes the previous prompt, not an optimizer. UTF-16 bounds preserve existing JavaScript slice semantics, including possible split surrogate pairs. Fingerprints reveal equality and are not anonymization. Explicit user input is not passed through a new DLP/redaction engine.

### Usage and duration

`Usage` is `provider-reported`, `synthetic` or `unavailable`, with nullable input/output/total token counters. Valid counts are nonnegative safe integers. Unknown is null, never an invented zero. Missing/invalid/inconsistent usage is unavailable; missing totals are not inferred. Provider extension fields are discarded.

Mock usage deterministically uses `ceil(input.length / 4)` and `ceil(output.length / 4)` plus the total. These are synthetic test counters, NOT an actual tokenizer, provider report, monetary estimate or bill. The UI explicitly marks `MOCK · SYNTHETIC USAGE · NOT BILLING`. Real mode does not accept synthetic usage. Cost is always null/Unknown.

Per-invocation measurements include UUID, context UUID, UTC start/completion, monotonic nonnegative `durationMs`, usage, null cost and persistence confirmation. Duration covers adapter execution and response validation/normalization, not either telemetry write or human pause time. UTC start is captured before the start write, so UTC subtraction need not equal monotonic duration. No whole-Execution time or billing total is claimed.

### Telemetry and Audit

Telemetry answers how the invocation operated: Agent/Provider/Model/backend, scoped context metadata, invocation identity, timing, result/safe code and usage. Stage 11 Audit independently answers who acted under which authority with what consequence. Stage 12 does not write audit events, grant permission, resolve secrets or weaken Knowledge publication controls.

Telemetry projects fixed metadata/count/reference fields only. It does not store prompt/output text, raw exceptions, arbitrary provider extension payloads, titles, environment values, vault paths or full domain objects. Existing Execution checkpoints continue to retain their prior-stage public outputs; they are not duplicated into telemetry. This is not a claim that all application content is secret-redacted.

### Persistence and failure semantics

Additive Migration 9 (`create_invocation_telemetry`) adds ordered snapshots with unique invocation/phase, restrictive Workspace/Execution foreign keys, a scoped index and append-only update/delete guards. Old migrations and records are unchanged. No historical telemetry is fabricated. Normally two events per attempted call (start/final), at most three planned calls, and scoped reads limited to 100 events: no event warehouse.

| Condition | Provider/Execution behavior | Telemetry evidence |
| --- | --- | --- |
| Invalid context or preflight | No provider call; safe bounded failure; retain prior contributions | No invented invocation history |
| Start persistence failure | Stop before the provider; `telemetry_unavailable`, not an authority denial | No claim of durable start |
| Provider throws / malformed response | Execution fails safely; completed contributions remain | Failed final with fixed safe code and unknown usage, if writable |
| Usage missing/invalid | Successful output still succeeds | Usage unavailable; cost unknown |
| Successful call, final write fails | Keep contribution and `measurement.telemetry = unconfirmed` | Unmatched start; UI explicitly shows uncertainty |
| Provider failure and final write fails | Retain safe Execution failure | Unmatched start, never fabricated success/failure |
| Abrupt stop | Existing Interrupted/no-automatic-replay policy | Keep only actually committed events |

Telemetry writes and Execution checkpoints are separate. A final provider-success record may exist without a committed contribution if a later checkpoint fails. Conversely, final telemetry may be unconfirmed while a useful contribution is committed. No false rollback/reconciliation/retry is added. Append-only triggers do not protect against a database owner altering the schema. Retention, rotation, encryption and cryptographic ledger protections are deferred.

Persisted coverage is Workspace Executions only. Home invocation and standalone collaboration return transient measurements (`not-recorded`); no new durable standalone history. Older contributions without measurements remain readable.

### API and UI

New GET `/api/workspaces/:workspaceId/executions/:executionId/telemetry` returns `{ records }`, ordered by append sequence. The Stage 11 trusted local-owner boundary applies: wrong/untrusted origin 403, non-GET 405, wrong/missing scope 404, malformed URI 400, read failure 503. No telemetry mutation endpoint exists. Existing provider requests add invocation/context IDs; adapter responses may include normalized usage; invocation/contribution results add optional measurements.

Execution detail adds only collapsed **Advanced: Context & Usage**, fetched on expansion and refreshed on Execution revision or explicit Refresh. Start/final events group by invocation. Attribution, result, context size/source/reason/truncation/omissions, usage, duration and unknown cost are visible. Failed reads have a visible retryable error, unmatched starts are in-flight/unconfirmed, and historical/unstarted records show honest absence rather than zeros. Main app composition and UI design are preserved.

## Automated verification

- `npm.cmd test`: PASS, **220 tests in 37 files**. No React `act(...)` warning and no warning suppression added.
- `npm.cmd run build`: PASS, strict browser/server TypeScript and Vite production build, **48 modules**.
- `git diff --check`: PASS. Windows LF/CRLF conversion notices are informational, not whitespace errors.
- All **194 Stage 1–11 regression tests** remain green: Workspace/Chat/Task, Agent/Mock invocation, collaboration, Pause/Resume/Cancel/restart, Artifact/Task Report, Knowledge/Obsidian and Stage 11 permissions/Secret/Audit.
- All automated databases/vaults are disposable temporary fixtures. No automated test reads/writes the real Obsidian vault.

New cases (26 tests):

| Test file | Cases | Coverage |
| --- | ---: | --- |
| `tests/context.test.ts` | 5 | Deterministic input/provenance, unique identity, 800-character truncation, UTF-16/UTF-8 metrics, validation, exclusions and operation isolation |
| `tests/providerUsage.test.ts` | 9 | Explicit synthetic counters; absent/malformed/negative/fractional/nonfinite/inconsistent usage; honest partial/null/zero provider counts; safe projection |
| `tests/telemetry.test.ts` | 8 | Actual runtime provenance, pause/resume, timing, scope, append-only persistence, provider/context/start/final failure, reload, additive migration and no historical fabrication |
| `tests/serverTelemetry.test.ts` | 1 | Real HTTP Mock Execution; private Chat/Knowledge exclusion; ignored forged scope; same-origin/read-only/scope checks; exact records and Execution across full server restart |
| `tests/ContextUsageDetails.test.tsx` | 3 | Lazy inspection, synthetic/unknown semantics, unmatched-start state and visible read failure/retry |

Existing test edits keep migration fixture baselines correct at schema 9, inject/close the telemetry repository in Execution fixtures, and distinguish deterministic Mock output/usage from naturally unique invocation identities. Assertions were not disabled. The UI tests synchronize with observable UI completion rather than suppressing React warnings.

## Controlled real-browser smoke — 2026-09-20

Used the computer-use skill/browser automation for actual UI interaction and visual inspection. Existing development port 5173 (and Vite HMR port) was occupied, so the attempted own `npm.cmd run dev` could not bind. Its watcher was stopped; the pre-existing user's process was left alone. The smoke used the **built production frontend and real API** with `npm.cmd start` on 5174, not a test mock of the UI.

Process-only environment overrides (no `.env.local` edit):

```powershell
$env:HAN_AI_STUDIO_PORT = '5174'
$env:HAN_AI_STUDIO_DATA_DIR = Join-Path (Get-Location) 'var/stage12-browser/data'
$env:HAN_AI_STUDIO_OBSIDIAN_VAULT = Join-Path (Get-Location) 'var/stage12-browser/disabled-vault'
$env:HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION = 'deny'
npm.cmd start
```

The dummy vault path is nonexistent; no connector publication occurred. Runtime data is local-only/ignored at `var/stage12-browser/data/studio.sqlite`.

Exact UI steps and evidence:

1. Open `http://127.0.0.1:5174/`; create/open **Stage 12 Context Usage Smoke**.
2. Workspace ID: `2eaf7b43-e931-481e-91fa-6f6ec5ae5106`.
3. Enter goal **Verify Stage 12 bounded context and synthetic usage without external data.**; choose Sequential, GPT → Gemini, no linked Task, leave pause-after-step checked; Create Execution.
4. Execution ID: `1677ed39-e920-444f-81ab-c4948b1c21fc`. Start → Paused after 1/2; expand **Advanced: Context & Usage** and inspect the first successful invocation.
5. Resume → Completed 2/2, attributed final Gemini contribution. Inspect both metadata/usage rows. Both show provider `mock`, model `mock-basic`, backend MOCK, success and cost Unknown.
6. Stop the owned smoke server completely, start it again with the same isolated database, reload/reopen the browser and Workspace, then expand Context & Usage. The same completed Execution, contributions, invocation IDs/context IDs, original timestamps, counts and metadata remained. A subsequent fresh browser reopen after another server stop/start confirmed the same records again; no new execution was created for restart verification.
7. Browser warning/error log: empty. SQLite integrity: `ok`; foreign-key violations: none. Knowledge rows: 0. Audit rows: 0. No real provider/key, Obsidian note or real-vault access required.

| Visible measurement | GPT / step-1 | Gemini / step-2 |
| --- | --- | --- |
| Invocation | `601fae7a-91ee-4e69-b330-99775d399669` | `79686eca-6037-4876-acf0-fa54a79e7e12` |
| Context | `d55c3c36-de9e-4f89-88f9-ee82eef12a93` | `8deb8c76-1c11-48f9-8adb-20ef44a42870` |
| Supplied characters / UTF-8 bytes | 161 / 161 | 536 / 536 |
| Synthetic input / output / total | 41 / 48 / 89 | 134 / 143 / 277 |
| Displayed duration | 0.65 ms | 0.17 ms |
| Previous contribution | Unavailable first step | 191 / 191 characters, not truncated, source step-1 |
| Result / cost | Succeeded / Unknown | Succeeded / Unknown |

Goal metadata showed 74 characters. Workspace/Execution scope showed reference-only zero copied content. The second handoff's source execution/step was visible. Fixed omission metadata showed no automatic Chat/Knowledge/Obsidian/unrelated Task/Secret/hidden reasoning/Audit loading. Both rows prominently said **MOCK · SYNTHETIC USAGE · NOT BILLING**.

There were exactly 4 persisted events, two starts/two finals. SHA-256 of `JSON.stringify(SELECT snapshot_json FROM invocation_telemetry ORDER BY sequence)` before and after server restart was identical:

`658f7413db472ad22eb6a6f263f89b8bdfb1f44f0a1d6d9ff8738786d0890cf8`

No duplicate/replayed invocation occurred. Temporary smoke data remains ignored for review. The builder-owned smoke server is stopped after verification. Existing narrow Prototype panels may require horizontal scrolling at the small in-app browser viewport; Stage 12 does not redesign their layout.

## Privacy / commit review

- New assembly code has no Chat/Knowledge/vault/Secret/Audit reader; telemetry contains only projected metadata, counts and references.
- Tests seed private Chat/Knowledge fields and dummy credential-bearing provider errors/usage extensions, and verify they do not enter context, telemetry, safe Execution errors or logs.
- Wrong-Workspace telemetry retrieval fails; forged client scope is not propagated. Provider identity remains the existing configuration-backed Mock binding.
- Migration diff is additive; governance/connector source is unchanged. The only changed runtime behavior is the authorized Context/Usage integration and conservative operational evidence policy.
- `.env.local`, runtime SQLite/sidecars, `var/stage12-browser`, generated `dist`, dependency directories and test artifacts are not staged. No dependency/lockfile/environment configuration change. No credentials added and no push performed.

## Limitations, deferred work and review gate

This is a local, one-owner, one-server-per-database prototype, not a secure multi-user telemetry service. Measurements are per-call, not complete system resource accounting. No historical backfill, standalone durable history, retention/rotation, automatic retrieval/context optimization, tokenizer, monetary billing/pricing, model routing/escalation, vector/graph memory, full RAG, external engine/MCP/tool expansion, cloud telemetry/analytics, workflow engine or final UX redesign.

Provider uncertainty, separate persistence gaps, current Unicode slicing and input-equality fingerprints are documented above, not hidden by invented values. The minimal browser smoke covers successful two-Agent pause/resume/restart inspection; automated tests cover failure/isolation/permission/regression paths. No real-provider performance or billing conclusion follows from Mock measurements.

Architect/HAN should review context sufficiency/provenance, scope isolation, honest synthetic/unknown usage, start-block/final-unconfirmed policy, Audit separation and metadata privacy. Stage 12 remains builder-complete pending that review, not independently accepted or sealed. STOP. DO NOT PUSH. STAGE 13 NOT STARTED.
