# Stage 11 — Permissions + Secrets + Audit verification

## Gate and baseline

Builder complete; awaiting Architect review and HAN acceptance. NOT PUSHED. NOT SEALED. Stage 12 NOT STARTED. One local completion commit is identified by `git rev-parse HEAD` after the commit containing this document; the exact hash is also in the Builder report.

Baseline was clean `main == origin/main` at `eeffe4538017053e8503647c384e5a3e0f43d575` (`Align LibreChat hybrid engine roadmap`). HAN's expected Stage 10 commit `e5e6168e0d5444111d0b95e635e906f2e772593d` is its direct parent. Inspection confirmed the intervening commit changes only five architecture/build documents, no executable code. The approved Hybrid Engine direction is preserved. HAN's handoff establishes Stage 10 PASS / HAN HANDS-ON PASS / INDEPENDENT VERIFIED / PUSHED / SEALED; stale review wording in BUILD-STATE is corrected accordingly.

No external Obsidian content was modified during baseline inspection. Implementation stayed above the existing safe connector; `src/connectors/obsidian/obsidianConnector.ts` is unchanged. No packages, provider SDKs, dependencies or lockfile changes.

## Implemented contracts and exact enforcement

See `docs/ARCHITECTURE.md` → Stage 11 for full executable contracts.

| Boundary | Actual contract / enforcement |
| --- | --- |
| Permission | Human/Agent/system actor; READ/WRITE/CREATE/MODIFY/EXECUTE/DELETE/EXTERNAL vocabulary; PHYSICAL reserved and denied. Typed resource and global/Workspace/Task/Execution scope. Default deny; explicit matching grants; normalized allowed/denied/approval_required. |
| Actor | HTTP-owned `human/han-local` only on trusted loopback/Host/Origin/Fetch-Metadata surface; Save also needs process-local CSRF context. Actor/grant/approval JSON injection rejected. Not a multi-user login or protection from local malware. |
| Runtime policy | Only local-HAN audit READ and reviewed Obsidian Knowledge publication. Publication grant is explicitly global across Workspaces; approvals are exact Workspace/resource/consequence. No Agent/runtime, secret-use, real-provider, engine or MCP grants. `deny` revokes publication after restart. |
| Approval | Server-issued UUID and immutable intent/actor/grant snapshot, 5-minute expiry, one attempted use. Exact action/resource/scope/connector/destination/content binding, no cross-resource use, forgery, replay or restart reuse. Persisted when consumed with start audit. |
| Review | Existing checkbox plus Save explicitly covers reviewed content and one external consequence. Current preview is recomputed server-side; its fingerprint binds record, Markdown and destination. Fresh retry requires new approval. React only presents the decision. |
| Secret | Stable allowlisted SecretRef, environment-backed server-only trusted synchronous consumer, configured/unavailable status, safe missing/consumer failure. Tested with dummy credentials; no live credential use or returned-value API. |
| Audit | Durable ID/attempt/time/actor/intent/decision/approval/outcome/code/schema. Only bounded references/fingerprints and safe codes; no raw content, prompts, paths, session values, secrets or exceptions. Append-oriented, not tamper-proof. |
| Real integration | Knowledge Save → governance → durable evidence → existing pending state → unchanged Obsidian connector → retained result → final audit. Audit read uses its explicit scoped permission. Dummy SecretService tests prove the future server consumption seam. |

Ordinary Workspace/Chat/Task/Execution/Artifact/Report and Mock calls are not all retrofitted with governance/audit. No universal application sandbox is claimed. Invalid/missing-resource/stale requests rejected before a valid action intent are not action audit events. Preview and audit reads do not manufacture history.

### Failure policy

- Denied or approval-required valid action: append `not_executed`, preserve source/candidate, no connector call, HTTP 403 or 409.
- Required pre-action evidence unavailable: rollback approval/start transaction; no consequential action, HTTP 503. In-memory approval is not reusable; retry requires fresh review.
- Missing secret: consumer never runs; safe failed audit and normalized error. Consumer exceptions are not copied into evidence/logs.
- Known connector failure: retain Stage 10 failed record and source, safe failed audit; explicit retry uses fresh approval, no overwrite.
- Unexpected action failure or crash gap: unconfirmed or unmatched start evidence, never fabricated success.
- Final audit persistence failure after action: HTTP 503 `audit_unconfirmed`, action may already be saved/published. Retain real state, inspect/read-only Verify before retry, never auto-replay. Audit, domain confirmation and external filesystem are not one transaction.

### Migration, API, UI and configuration

Migration **8 / create_governance_evidence** only adds `authority_approvals`, `audit_events`, scoped index and immutable/append-only triggers. Workspace/approval foreign keys are restrictive. Approval consumption plus start audit share one transaction. Migrations 1–7 and all historical domain data are preserved; no audit backfill.

New GET endpoints: `/api/governance/session`, `/api/governance/secrets`, `/api/workspaces/:workspaceId/knowledge/:id/governance`, and `.../:id/audit`. Preview adds `decision`; Save requires `x-han-session` and `{approved: true, previewToken}`. No resolve-secret, mint-approval, grant-management, deletion or engine endpoint exists. API JSON is no-store/nosniff.

Existing Knowledge UI shows decision/reason, disabled denied controls and the same explicit review checkbox. A collapsed Advanced section shows recent 20 resource-scoped audits and Secret reference/status only. Fetch failures are visible. No enterprise dashboard or overall redesign.

`HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION=review` is default; any other value fails closed to deny. Optional Secret mappings: `HAN_AI_STUDIO_SECRET_OPENAI`, `HAN_AI_STUDIO_SECRET_GEMINI`, `HAN_AI_STUDIO_SECRET_GITHUB`, `HAN_AI_STUDIO_SECRET_ENGINE`. Blank examples only, no real keys. `HAN_AI_STUDIO_OBSIDIAN_VAULT` remains separate configuration. Ignored `.env.local` is loaded only at executable entry; process overrides win. Policy/service changes require full restart. Non-loopback binding is rejected before creating a database.

## Automated verification

Commands run on Node 24.21.0 / npm 11:

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

- **32 test files / 194 tests PASS**, including all 164 previous Stage 1–10 tests and 30 new Stage 11 cases. No React `act(...)` warning or warning suppression.
- **Production build PASS**: strict browser/server TypeScript checks and Vite, 47 transformed modules.
- **Diff whitespace check PASS**. Git's ordinary LF→CRLF checkout notices are not diff errors.

New suites:

- `tests/governance.test.ts`: absent/Agent/system/ungranted actor default denial; approval-required; bounded metadata/projection; explicit allowed internal action; real connector effect only after durable evidence; wrong action/resource/Workspace/destination/fingerprint/actor approval; forged/modified/expired/replayed/restarted approval; scope and revocation; pre-/post-audit outage; safe failure and fresh retry.
- `tests/governancePersistence.test.ts`: reopen preserves approval/audit/scope, append-only triggers and foreign keys; populated Stage 10 migration is additive with no fake history.
- `tests/secret.test.ts`: server-only dummy resolution, no arbitrary environment lookup, safe status/private serialization; no resolution without authority/approval; success/missing/consumer failure audits; no credential in errors, audits or console logging.
- `tests/serverGovernance.test.ts`: real HTTP nonce/Origin/Fetch-Metadata/Host controls (raw HTTP for Host because Fetch normalizes it), API injection/scope validation, no note on denied/unapproved requests, safe reference status, allowed save/audit, restart/revocation, non-loopback rejection before DB creation.
- `tests/KnowledgePanel.test.tsx`: expanded authorized Save/header fixture plus denied controls and visible failed governance fetch. Existing tests adapt only to required actor/session context and additive schema version 8.

Automated writes use temporary directories, never HAN's vault. Secret fixtures use conspicuously dummy strings only. Inspectable API/audit assertions exclude those strings, raw content/title, vault paths and session tokens. Console spies verify no log calls rather than suppress warnings. No snapshot containing credentials is generated.

## Controlled real-browser smoke — 2026-09-20

Used the normal combined `npm.cmd run dev` command and the actual browser application, with process-only isolation (no `.env.local` edit):

```powershell
$env:HAN_AI_STUDIO_DATA_DIR = Join-Path (Get-Location) 'var/stage11-browser/data'
$env:HAN_AI_STUDIO_OBSIDIAN_VAULT = Join-Path (Get-Location) 'var/stage11-browser/vault'
$env:HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION = 'deny'
npm.cmd run dev
```

The temporary vault's empty `.obsidian` directory was created before startup. The app ran at `http://127.0.0.1:5173/` with the existing Mock test backend. These variables applied only to the smoke process; real configuration remains unchanged. Smoke servers were stopped afterward.

Evidence:

1. Created Workspace **Stage 11 Governance Smoke** in the browser: `1dc61738-8c21-4b16-866e-5fd25cbd9565`.
2. Prepared manual candidate **Stage 11 disposable governance smoke**: `45cadd86-5aef-4b97-97fe-a211efb9804f`. Preparation created no vault files.
3. Browser visibly showed `Authority: denied` and the no-explicit-grant reason. Approval and Save were disabled. Advanced initially showed no fabricated historical events and four unavailable Secret references.
4. A direct same-local-runtime request with valid session/preview and `approved:true` under deny returned **403**, appended denied/not_executed audit and created **zero files**. This supplementary API check proves server enforcement independent of disabled UI.
5. Fully stopped/restarted the same `npm.cmd run dev` with `HAN_AI_STUDIO_KNOWLEDGE_PUBLICATION=review`, same isolated data/vault. A valid-session request with `approved:false` returned **409 approval_required** and still **zero files**.
6. Reopened the persistent Workspace in browser. Authority was visibly approval_required; Save disabled until explicit checkbox. Expanded exact Markdown/destination and Advanced, visibly reviewed both refusal events and safe status only.
7. Checked review approval and invoked Save through the browser. Exactly one **temporary-vault** Markdown file was created; record became Saved. **Verify Saved Note** visibly reported exact match.
8. Advanced showed human/han-local, EXTERNAL, correct Knowledge resource, allowed/started then allowed/succeeded with matching attempt `b79dac36-501c-4df1-88dc-162c4e0b0c74` and approval `44b7a539-69ec-405d-a450-1078266e3568`, plus the two prior refused attempts.
9. Fully stopped/restarted again, reloaded browser, reopened Workspace. Same Saved record, exact note verification, four audit events and approval IDs remained. No duplicate file. Browser warning/error log was empty.
10. Home's original Message → Invoke test Agent returned visibly marked **MOCK · TEST OUTPUT** after restart. Other Stage 1–10 regressions are covered by the unchanged complete automated suite.

Temporary SQLite inspection: **4 audit rows, 1 consumed approval, integrity_check=ok, foreign_key_check empty**. Temporary note is 569 bytes and remains locally available for review, not deleted:

`var/stage11-browser/vault/Knowledge/AI-Studio-Generated/knowledge-stage-11-disposable-governance-smoke-45cadd86-5aef-4b97-97fe-a211efb9804f.md`

This is a real browser/server/filesystem consequence in an isolated vault, not a mocked connector. It avoids an unnecessary additional real-vault note.

### Configured real vault — read-only observation

**No Stage 11 real-vault note was created. No real-vault notes were changed or deleted.** No destructive tests or publication ran against the configured real vault.

Read-only inspection of the configured vault and existing default SQLite record found:

- 105 existing Markdown files; hashes before/after the read-only check identical. Sorted relative-path/hash manifest digest: `e9ec85e70de76fcad482fa11d5516454561c1425123d063bcbdd01af973f5742`.
- The historical Stage 10 Knowledge record `c176be7e-b627-4f10-822e-15b9fac1a4a4` remains Saved, but its previously documented disposable file is **absent**. Existing read-only connector Verify correctly returned `matches:false`; no recreation occurred.
- Historical relative path: `Knowledge/AI-Studio-Generated/knowledge-stage-10-disposable-smoke-knowledge-c176be7e-b627-4f10-822e-15b9fac1a4a4.md`.
- This records present state, not a claim about when or by whom the file was removed, and does not overwrite Stage 10's historical successful smoke evidence. The default database was opened read-only; Stage 11 smoke did not migrate or alter it.

## Limitations / Architect review points

1. Accept the trusted single-local-owner actor assumption and explicitly global HAN publication grant with exact per-attempt approvals. Local processes can obtain session context; there is no authentication platform, Agent process isolation or universal governance on older internal APIs.
2. Accept single-interaction content + authority approval, five-minute process-bound one-use approvals, and restart-based policy revocation. No approval inbox, persisted editable grants or fine-grained administration.
3. Accept atomic pre-action evidence but non-atomic filesystem/domain/final-audit completion. Unmatched starts or `audit_unconfirmed` require inspection; no automatic retry, rollback claims or audit backfill.
4. Secret boundary is trusted synchronous server code, not sandboxed/async real-provider execution, DLP, encrypted vault or key rotation. No real credentials, provider/engine integration, MCP tools or egress grants were added.
5. Audit is append-oriented under application SQL rules, not cryptographically tamper-proof or protected against its database owner. Recent UI history is bounded to 20; retention/export/search are deferred.
6. Existing connector requires hard links and trusted local path ownership; no hostile concurrent directory-swap protection. Saved missing/edited notes are reported, not overwritten. The currently missing historical Stage 10 smoke note is left for HAN's awareness, not silently repaired.
7. Approved Hybrid Engine roadmap remains documentation only. Actual engine egress/credential isolation needs explicit Stage 12 design, implementation and review; no Stage 12 work is included here.

## Handoff

BUILD-STATE: **Stage 11 / Builder complete / awaiting Architect review and HAN acceptance / NOT PUSHED / NOT SEALED; Stage 12 NOT STARTED.**

Commit only the enumerated Stage 11 source/tests/docs/config example. Runtime SQLite/sidecars, ignored local environment, temporary vault and built assets are not committed. No external dependency changes. After the one local commit, STOP for review; do not push or advance the stage.
