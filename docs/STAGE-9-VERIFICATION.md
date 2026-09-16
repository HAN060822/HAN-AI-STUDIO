# Stage 9 hands-on verification

Stage 8 is PASS / HANDS-ON PASS / PUSHED / SEALED. Stage 9 is builder-complete, pending HAN + ChatGPT independent review. Do not push or begin Stage 10 automatically.

## Architecture decisions

- Task, Execution, raw contribution, Artifact and Task Report remain distinct.
- A Task may own many immutable text Artifacts. Nothing automatically promotes Execution output.
- Prototype 0 has one stable current Task Report per Task. Explicit regeneration refreshes its observable snapshot under the same report ID; report version history is deferred.
- Contribution-backed Artifacts copy committed content plus Execution/step/Agent/Provider/Model/backend provenance. Direct text Artifacts are supported by the application/API contract, while the initial UI focuses on the required Execution-output preservation loop.
- Reports deterministically summarize stored records. They are not AI-authored analysis and contain no hidden reasoning.

## HAN procedure

1. Run `npm.cmd run dev` and open `http://127.0.0.1:5173`. Default provider mode is deterministic Mock.
2. Create/open a Workspace and create a Task. Return to the Workspace, then click **Refresh Executions** and **Refresh Outcomes** so both selectors see the new Task.
3. In **Prototype Executions**, link that Task, enter a short goal, choose explicit participants, and optionally uncheck the safe-boundary demo for one uninterrupted bounded run.
4. Create and Start the Execution. Complete it normally, or use Stage 8 Pause/Resume first. Confirm committed contributions remain in Execution history.
5. In **Artifacts & Task Reports**, click **Refresh Outcomes**, select the Task, then select one committed Execution contribution.
6. Enter an Artifact title, choose Result/Document/Note, and click **Preserve Artifact**.
7. Inspect the new Artifact. Confirm copied content is visibly separate from raw Execution history and includes Task, Execution, step, Agent, Provider, Model and Mock/Real provenance.
8. Click **Generate Task Report**. Confirm its stable ID, Task goal/status, deterministic summary, related Execution count, observed Agents, Artifact count, timestamp, and any attributable failure limitation.
9. If another Artifact is added or Task/Execution state changes, click **Regenerate Task Report**. The report ID must stay the same while the observable snapshot updates.
10. Reload the browser, reopen the Workspace and confirm the same Artifact and Task Report remain.
11. Stop the development server, run `npm.cmd run dev` again, reload/reopen, and confirm identity, content, provenance and references remain unchanged.
12. Confirm Task planning status and terminal Execution history were not mutated by Artifact preservation or report generation.

## Builder evidence

- Normal startup initially exposed a Node strip-only incompatibility in a new constructor; explicit fields fixed the root cause and the exact startup path then passed.
- Real browser Workspace `Stage 9 outcome verification` contains a Draft Task, one completed linked GPT → Gemini Mock Execution, formal Artifact `Stage 9 final Mock result`, and one deterministic Task Report.
- The Artifact preserved Gemini's final committed output with full Mock provenance. The report displayed one completed Execution, both Agent identities and one Artifact.
- Browser reload and full development-server restart reconstructed the same Artifact and report. Browser warning/error log was empty.
- The ignored `var/studio.sqlite` contains only local smoke data; it is not committed.

## Persistence and limitations

- Migration 5 adds Artifact and Task Report snapshot tables with restrictive Workspace/Task/Execution foreign keys. Migration 6 adds restrictive report-to-Execution and report-to-Artifact reference tables; regeneration updates report snapshot and references transactionally.
- Artifact content is text-only and immutable. No edit/delete UI, binary store, file attachment, auto-preservation or Knowledge promotion exists.
- One canonical current report is retained per Task; historical report versions and automatic regeneration are deferred.
- Mock output proves routing, provenance, persistence and presentation—not intelligence. The report uses transparent deterministic text.
- No real credentials, network provider dependency, external action, secret system, Obsidian/Knowledge connector, backup architecture, Stage 10 behavior or permission expansion was added.

## Changed files (24)

```text
BUILD-STATE.md
README.md
docs/ARCHITECTURE.md
docs/STAGE-9-VERIFICATION.md
src/app/outcomes/OutcomePanel.tsx
src/app/outcomes/outcomeApi.ts
src/app/styles.css
src/app/workspaces/WorkspaceView.tsx
src/application/outcomes/outcomeRepository.ts
src/application/outcomes/outcomeService.ts
src/core/outcomes/artifact.ts
src/core/outcomes/taskReport.ts
src/server/httpServer.ts
src/storage/sqlite/migrations.ts
src/storage/sqlite/sqliteOutcomeRepository.ts
tests/App.test.tsx
tests/executionPersistence.test.ts
tests/outcome.test.ts
tests/outcomeFixtures.ts
tests/outcomePersistence.test.ts
tests/OutcomePanel.test.tsx
tests/serverOutcome.test.ts
tests/taskPersistence.test.ts
tsconfig.node.json
```
