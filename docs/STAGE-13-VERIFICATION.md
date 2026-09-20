# Stage 13 — End-to-End Integration & Recovery

## Status and baseline

Builder complete; awaiting Architect review and HAN acceptance. **NOT PUSHED; NOT SEALED. Stage 14 NOT STARTED.**

Baseline: `acf817d014592234ccd56007305f751a61d4438c` — `Complete Phase 9 Stage 12 context and usage telemetry`. Local `HEAD` and `origin/main` were verified at that sealed Stage 12 commit before the final Stage 13 commit. The resumed session inspected and retained the existing Stage 13 changes; it did not reset, redesign, or redo completed implementation. Final local commit message: `Complete Phase 9 Stage 13 end-to-end integration and recovery`. Its exact self-referential hash is `git rev-parse HEAD` after commit.

Stage 13 follows HAN's current handoff, not the old engine/MCP/RAG roadmap. No real provider, Ponytail, Jev, Builder Harness change, new workflow engine or Stage 14 UX work was introduced.

## Small integration repairs

1. **Artifact response-loss retry:** previously each repeated POST allocated a new identity, so a committed save with a lost response could be duplicated. An optional UUID-v4 `creationId` now identifies one intent through the existing Artifact primary key. After scope/source/content validation, an exact repeat returns the stored record unchanged; conflicting reuse returns 409. Legacy callers without the field retain their behavior. The UI retains the ID and draft on uncertainty and merges by ID after Refresh/retry. Unknown persistence errors no longer claim that nothing was saved.
2. **Already-saved Knowledge audit:** the existing saved branch verified bytes but governance recorded another `succeeded` publication. It now returns `not_executed / already_saved_verified`. Current permission, exact review, one-use approval, consumed approval/start evidence and safe final evidence are still required. Unmatched historical starts are never backfilled. GET Verify remains read-only.
3. **Invalid recovery state:** Execution list/get and startup now validate bounded checkpoint consistency. Invalid state fails explicitly before work or fabricated progress. Startup failure closes the initialized listener/repositories/Vite. No automatic data repair or lifecycle redesign.
4. **Development runtime isolation:** normal development HMR now shares the application's HTTP listener using installed Vite 8's `server.ws.server`. The first isolated smoke startup exposed a separate default-HMR-port collision with another dev instance. The final normal-dev runs started without that collision; the existing unrelated process was not stopped to hide it.

There is no migration, dependency, configuration-variable, route, provider, grant, context-bound or stored-schema change. Material modules: `src/app/outcomes/OutcomePanel.tsx`; application Execution, Outcome, Knowledge and Governance services; core Execution, Artifact and Governance contracts; `src/server/httpServer.ts`. Tests: new `serverIntegration.test.ts`, new `knowledgeRecovery.test.ts`, amended `OutcomePanel.test.tsx`. Documentation: this file, `BUILD-STATE.md`, `BUILD-PLAN.md`, `README.md`, `docs/ARCHITECTURE.md`.

## Automated evidence

Final verification on **2026-09-21, Asia/Kuala_Lumpur**:

| Check | Result |
| --- | --- |
| Focused integration/recovery/UI/telemetry/persistence run | 5 files, 24 tests passed |
| `npm.cmd test` | 39 files, **229 tests passed**; no React `act(...)` warnings or unhandled errors in the final run |
| Regression coverage | All 220 existing Stage 0–12 tests retained; 9 added Stage 13 cases |
| `npm.cmd run build` | Strict browser/server TypeScript checks and Vite production build passed; 48 modules |
| `git diff --check` | Passed |
| Isolated browser SQLite | `integrity_check = ok`; `foreign_key_check = []` |

Focused command:

```powershell
npm.cmd test -- tests/serverIntegration.test.ts tests/knowledgeRecovery.test.ts tests/OutcomePanel.test.tsx tests/telemetry.test.ts tests/executionPersistence.test.ts
```

One earlier full-suite attempt passed 225 tests but failed to start one jsdom worker because it could not load an installed `HTMLLabelElement-impl.js` module. The file existed and loaded in a direct jsdom check. The unchanged full command reran successfully (229/229); no package/configuration change, console suppression or assertion removal was used. This was not recorded as a passing run.

### Cross-module scenarios

`serverIntegration.test.ts` uses actual HTTP routes, production composition, SQLite, deterministic Mock adapters and a disposable Obsidian vault. It does not load `.env.local`. Every fixture includes an unrelated sentinel note verified unchanged before cleanup.

- Workspace → Chat/human message → linked Task → selected GPT/Gemini → Orchestrator/Context/Adapter → pause after contribution 1. Full server close/reopen preserves exact objects and Stage 12 events. Resume adds only contribution 2; terminal resume returns 409. Private Chat sentinel is absent from provider contributions/context path.
- Preserve Artifact, repeat same creation identity before/after restart, reject changed intent; only one Artifact. Regenerate report with stable ID; only one current report. Prepare both Artifact and Task Report candidates.
- Missing approval and stale preview return 409; fresh reviewed save creates one note, Verify matches, fresh reviewed saved retry records no second publication success. Another restart preserves completed Execution, telemetry, Artifact, Report, saved Knowledge, unsaved candidate, exact audits and consumed approvals. Old process-local session returns 403. Note bytes and unrelated sentinel stay unchanged; integrity/FK checks pass.
- Cancelled remains terminal after restart with useful contribution retained. Restart with Mock disabled fails the remaining step as `agent_unavailable`, retains earlier work/evidence, and still permits deliberate Artifact/report creation from known-good work. Failed reports have no false final contribution.
- Deliberately inconsistent disposable checkpoint is rejected by get/list/resume without additional telemetry. Invalid running startup rejects with `invalid_checkpoint`, preserves the bad snapshot and releases the listener; restoring the test fixture permits binding the same port. Application code performs no repair.
- An injected durable abrupt-stop shape (`running`, step 2 in flight, step 1 committed) becomes terminal Interrupted on restart without replay or invented final telemetry; second restart is stable. This is deterministic checkpoint-shape fault injection, **not an OS hard-kill/power-loss test**.

`knowledgeRecovery.test.ts` exercises actual execution/outcomes/governance/storage/connector services with bounded fault injection:

- Final telemetry append failure retains completed contributions with `unconfirmed` measurements and unmatched starts/unknown usage. Deliberate Artifact/Knowledge preservation still works; no final evidence is invented.
- File publication succeeds but saved-record confirmation fails: pending intent and unconfirmed audit survive reopening. Fresh review confirms the identical existing note without duplicates or source mutation; a missing-approval retry remains denied.
- Final audit append fails after a saved record: saved note and unmatched start survive. Read-only Verify adds nothing. Fresh reviewed saved retry records `already_saved_verified`, not a fabricated success for either attempt.
- Connector failure/unavailable configuration preserves candidate and source work, hides raw injected detail, and permits valid reviewed retry after reopening. A simulated edit to that fixture's own note yields read-only verification mismatch; save refuses overwrite and does not append another success.

The amended OutcomePanel test simulates a POST committed before its response is lost; Refresh finds the saved Artifact, unchanged retry sends exactly the same creation UUID/input and shows it once, and remount performs no new POST. Existing Stage 8/11/12 tests additionally retain coverage for pending pause/cancel, concurrent controls, provider throw/malformed output, invalid Context, telemetry-start failure, denied/default-deny permissions, expired/tampered/replayed approvals, required-audit failure, path/link safety and secret redaction.

## Real browser procedure and observed result

Used the computer-use skill for actual UI interaction and visual verification, not test-only React renders. The normal startup command remained **`npm.cmd run dev`**, with process-only isolation:

```powershell
$env:HAN_AI_STUDIO_PORT='5174'
$env:HAN_AI_STUDIO_DATA_DIR=Join-Path (Get-Location) 'var/stage13-browser/data'
$env:HAN_AI_STUDIO_OBSIDIAN_VAULT=Join-Path (Get-Location) 'var/stage13-browser/vault'
$env:HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION='review'
$env:HAN_AI_STUDIO_PROVIDER_MODE='mock'
npm.cmd run dev
```

The isolated vault already contained its test-only `.obsidian` directory. No environment file was edited and no real provider/secret was needed. Runtime advertised Mock, configured Obsidian with review, and required approval/durable audit. The smoke used `http://127.0.0.1:5174/`; independent engineering panels used their existing explicit Refresh controls. Existing narrow-viewport horizontal overflow remains a known Prototype layout limitation, not a Stage 14 redesign in this stage.

1. Created Workspace **Stage 13 Integration Recovery Smoke** and Task **Stage 13 durable reviewed outcome** using the UI. Task goal: `Verify useful Mock work survives refresh and restart before reviewed publication.`
2. Created linked Sequential GPT → Gemini Execution with pause-after-step enabled. Start visibly reached Paused, completed steps 1/2, no recorded in-flight step, next step `step-2`, with GPT Mock contribution.
3. Refreshed the browser and reopened the Workspace: same paused ID/checkpoint/contribution and valid Resume control. Stopped the owned dev process completely and started the same command/configuration again; browser reload/reopen showed the identical checkpoint. Resume completed only Gemini; completed 2/2, no next step and no false terminal Resume control. Task remained Draft.
4. Inspected **Advanced: Context & Usage**: two attributed invocation/context IDs, bounded goal/action/immediate handoff, metadata-only reference scope and explicit omissions, **MOCK · SYNTHETIC USAGE · NOT BILLING**, Cost Unknown.
5. Refreshed Outcomes, preserved Gemini's final contribution as **Stage 13 recovery smoke artifact**, and generated a deterministic Task Report showing 1 completed Execution, 2 Agents and 1 Artifact while Task remained Draft.
6. Refreshed Knowledge, prepared the Artifact candidate, opened Markdown preview, reviewed content and exact isolated destination, checked approval, saved, and selected Verify. UI showed **Verified: the Markdown note matches this Knowledge record.** Advanced details showed one approval-bound started/succeeded audit pair and unavailable Secret references.
7. Prepared a Task Report-derived candidate but deliberately did not approve or publish it. It remained Candidate, separate from saved Artifact Knowledge.
8. Captured read-only hashes of the nine relevant database tables and exact note. Fully stopped/restarted normal dev again, reloaded/reopened the browser, and observed the same completed Execution, Artifact/report, saved Knowledge and unsaved candidate. Re-Verify succeeded; original audit/approval and both invocation identities/timestamps/usage remained visible.
9. All nine table hashes and note bytes matched after restart and read-only inspection. Browser warning/error log was empty. The owned smoke runtime was then stopped; retained test data is ignored and local only.

### Exact retained identities

| Object | ID |
| --- | --- |
| Workspace | `d5ebfd12-a70c-4733-ad50-5ccfbc6a136c` |
| Task (still Draft) | `ee98c4d9-6fd6-48df-9ad4-6f6bdc89bab7` |
| Execution (Completed, 2/2) | `d3b0d512-5609-457f-84dc-1617f5d5a340` |
| Artifact | `fab006f1-7534-4da6-8379-dc06ac05a08a` |
| Task Report | `fbe2c2d2-46c1-473b-8834-a1603694c229` |
| Saved Artifact Knowledge | `a4f10c16-647f-4780-bda9-0ed194dd5c58` |
| Unsaved Report Knowledge | `be9971d2-3b3d-4a0b-a085-eb6c07ed356d` |
| Consumed approval | `c215fe7a-75e2-4482-8633-fe33bbca89c5` |
| Publication attempt | `5abcbc1d-6484-434c-9752-f1f8bd92874d` |
| GPT invocation / context | `0c99189c-e16a-405a-b242-fc50215aa5f1` / `4e3ca531-60cd-45ba-ba04-aeac2ce650d5` |
| Gemini invocation / context | `73caeaf4-5493-4b85-8a10-78212d654bb5` / `d884fd91-fa3b-4f5e-a5b2-9c59ca066416` |

Execution started `2026-09-20T23:26:42.878Z`, paused `23:26:42.889Z`, completed after restart/resume `23:29:51.281Z`. Knowledge saved `23:30:35.415Z`. These UTC timestamps are **2026-09-21 morning in Asia/Kuala_Lumpur**.

### Restart equality evidence

Read-only Node `DatabaseSync` queries serialized every row of each table ordered by `rowid`; SHA-256 was calculated on that JSON, not on the changing SQLite/WAL container bytes. Before/after comparisons were identical. No query mutated the smoke data.

| Table | Rows | SHA-256 before = after |
| --- | ---: | --- |
| workspaces | 1 | `933f4828fe6ef79c37f059e96edf112011944b8c62976fd618b3fff7c32917b8` |
| tasks | 1 | `e0a740832e46883ff24b2ea6b2bbeef9e2d9993d6b18561a18244b61ef88d2d5` |
| executions | 1 | `11ec4a39e4d2b5f7f34a9a05c9d0458884093cf700519675678d5131d9796b59` |
| artifacts | 1 | `ec227d4c6aee71d9635e79f73803c25778ae121c929b216f907e8f9dc11c3e61` |
| task_reports | 1 | `b88211e493f52580f837b2aa276677c2bd427ff08ea75747afbe9bc3eedefce6` |
| knowledge | 2 | `65ebbcfd61a7b08db223c1f3b4ac528ae885858f010b1643b560435f4fa97e3d` |
| authority_approvals | 1 | `744d1239b326bf043a4e0ad1d0ddb8643e73e1394268519f29798dc100757fa2` |
| audit_events | 2 | `f6ce27d27180bba4b4ce2f7e0e0554faa3b3de09d3bf5a8c3cb34c45dd1c9a4f` |
| invocation_telemetry | 4 | `e7d7207156301cf8d7efe84fde4dd25a1a974f69f353ab7c9ff3adb5be564363` |

### Obsidian test files

Exactly **one retained Stage 13 browser smoke Markdown note** was created, in the isolated test vault, not HAN's real vault:

```text
C:\Users\HAN HAO DING\Documents\Codex\Codex Project\HAN-AI-STUDIO\var\stage13-browser\vault\Knowledge\AI-Studio-Generated\knowledge-stage-13-recovery-smoke-artifact-a4f10c16-647f-4780-bda9-0ed194dd5c58.md
```

SHA-256: `2256a4e4d67d8fe7978d181dcf2ec8c261858df7f107158f6721dad7ac17577b` before/after restart and Verify. The unsaved Task Report candidate created **no note**. Its preview path is not a created file. No unrelated real-vault notes were accessed or modified. Automated fixtures created their own temporary notes and removed those fixtures during teardown. Retained browser DB: `var/stage13-browser/data/studio.sqlite`; all of `var/stage13-browser/` is ignored, not part of the commit, and left for HAN/Architect to inspect/remove after acceptance.

## Recovery boundaries and limitations

- Work State Continuity concerns committed domain records and metadata, not provider hidden state, current page navigation, unsaved drafts, form approval, local session token, or transient Home collaboration results. Refresh returns to Home; reopen the Workspace to inspect durable work. New save obtains fresh local authority context after restart.
- Pause is at a safe step boundary, not provider-call suspension. Completed/Cancelled/Failed/Interrupted remain terminal. A lost uncommitted in-flight output cannot be recovered; no automatic replay, scheduler, timeout, background retry or uncertain-call resume is added.
- SQLite checkpoints, telemetry, Knowledge confirmation, external note publication and final audit are not one transaction. Preserve known-good facts and unmatched starts; do not infer completion from absence of a final event. Pending Knowledge with identical existing bytes may be confirmed by fresh reviewed retry; a Saved note missing/edited later is reported, never overwritten.
- Artifact UUID protection is per explicit intent in the single-server Prototype. Deliberate new identities may create multiple Artifacts; legacy callers without IDs do not gain deduplication. Full reload loses the pending form/ID and only fetches persisted outcomes; inspect them before making a new intent. Knowledge preparation likewise deliberately creates a new candidate identity and is never automatically repeated by reload.
- Task Reports remain explicit deterministic current snapshots, not AI synthesis or automatic task completion. Chat → Task is covered over real HTTP; the browser legitimately used a standalone Workspace Task without artificially creating a Chat.
- Invalid checkpoint validation is not general corrupt-database salvage, migration backup or multi-process ownership. Startup may refuse invalid running state without repairing it. Browser restarts were real process stops at safe boundaries; abrupt-stop evidence uses a disposable stored-shape injection, not hardware crash simulation.
- Stage 11 local-owner/default-deny/review/approval/audit/no-overwrite and Stage 12 bounded metadata-only/synthetic-not-billing/unknown-cost rules remain unchanged. No real credentials, network AI, RAG, broad context loading or hidden reasoning storage.
- Existing engineering-panel manual refresh and narrow-screen overflow remain; final UX is deferred. No known Stage 13 blocker or major sealed-contract architecture conflict was found.

## Final gate

Inspect the scoped source/tests/docs diff; exclude runtime DBs, environment/secrets, generated assets and test notes. One final local commit only, clean tracked working tree, `main` one commit ahead of unchanged `origin/main` Stage 12 baseline. **STOP for review. NOT PUSHED. Stage 14 NOT STARTED.**
