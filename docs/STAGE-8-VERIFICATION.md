# Stage 8 hands-on verification

Stage 8 is builder-complete, pending HAN + ChatGPT independent review. Do not push or begin Stage 9 automatically.

## HAN procedure

1. From the repository, run `npm.cmd run dev` and open `http://127.0.0.1:5173`. Use one server per database; stop an existing development server before starting another. Default provider mode is Mock; `HAN_AI_STUDIO_PROVIDER_MODE=none` intentionally disables invocation.
2. Create/open a Workspace. Optionally create a Task in its existing Task panel. Task planning status is independent of Execution state.
3. Find **Prototype Executions**. If you just created a Task, click **Refresh Executions** to update the optional Task selector. Select the Task, or leave **Standalone Workspace request**.
4. Enter a short Execution goal (1–500 characters), choose Sequential, and leave GPT then Gemini selected. Keep **Pause after each completed step (safe-boundary demo)** checked.
5. Click **Create Execution**. Inspect its new UUID, linked Task, goal, mode and **created** state. Creation alone invokes no Agent.
6. Click **Start Execution**. With fast Mock, Running may be brief; it should settle at **paused**, completed steps **1 / 2**, next incomplete step **step-2**. Inspect GPT's clearly marked Mock contribution.
7. Click **Refresh Executions** and confirm it still has only one contribution. Gemini does not run merely because time passes or the page refreshes. This is a genuine safe-boundary pause, not a paused provider call.
8. Click **Resume Execution**. Expect **completed**, **2 / 2**, distinct GPT and Gemini contributions and **Final contribution: Gemini · step-2**. GPT's completed step is retained, not rerun. Linked Task remains at its human-maintained planning status.
9. Create another Execution with a different goal and the boundary option checked. Start it and wait for Paused. Click **Cancel Execution**. Expect **cancelled**, the first contribution retained, no successful final, and no Resume/Start control for that terminal record.
10. Refresh the browser, reopen the Workspace, and choose the cancelled/completed records from Execution history. Verify IDs, outputs, provenance and terminal statuses remain unchanged.
11. Create a third Execution, optionally in Review / Challenge mode. Start it to Paused. Stop the development server (Ctrl+C), run `npm.cmd run dev` again, refresh the browser and reopen the Workspace. The record should still be Paused with its original first contribution. Resume it to complete only the remaining step.
12. For ordinary all-steps execution, uncheck the boundary option on a new attempt. Fast Mock may finish before a human can click Pause. Do not infer mid-call suspension from this demonstration. While an actual call is outstanding, Pause/Cancel is explicitly shown as requested until that call settles.

## Builder evidence

- Exact normal startup path passed, with real browser interaction and screenshot inspection.
- Workspace `Stage 8 runtime verification` contains a Draft Task and three smoke attempts: completed linked sequential, cancelled with one retained contribution, and review resumed after full server restart.
- Browser refresh preserved the cancelled record. Full `npm.cmd run dev` restart preserved the paused review checkpoint and subsequent completion.
- Linked Task remained Draft. Home's independent single-Agent invocation and standalone Stage 7 collaboration both returned marked Mock output after integration.
- Automated tests use held adapter promises for in-flight Pause/Cancel, cancellation superseding pause, and failure after a pause request; no artificial sleep-based provider race is required.
- Abrupt-process recovery is tested by reconstructing the durable in-flight checkpoint in SQLite and invoking startup recovery. It becomes Interrupted, with earlier contribution and failed/uncertain step attribution retained and no provider replay. The fast real-browser Mock demonstration does not claim to reproduce an in-flight crash.
- Browser console check returned no errors or warnings during the smoke sequence. Runtime database and smoke records remain ignored, not committed; pre-existing Workspaces were not modified.

## Review points and limits

- Interrupted is deliberately terminal. Only a safely Paused checkpoint can resume. Starting a new attempt is an explicit human choice and may redo earlier work.
- Provider calls cannot be suspended or forcibly cancelled through the current adapter contract. Pending controls prevent subsequent steps and preserve a returned contribution. A final successful step completes despite a pending pause; pending cancellation instead produces Cancelled with retained output. Provider failure remains Failed even if a control was pending.
- A crash or disk failure before a contribution checkpoint can lose that uncommitted output. No exactly-once provider guarantee, silent retry, automatic restart, multi-process ownership or distributed recovery is claimed.
- The current Local Runtime needs one server process per database, but this is not part of the Execution domain identity; runtime implementations remain replaceable through the port.
- Goals and handoff context retain Stage 7 bounds. No private reasoning, real credentials, new authority, scheduler, Workflow Engine, Stage 9 artifact/report, or Stage 11 permission framework is implemented.

## Changed files (25)

```text
BUILD-STATE.md
README.md
docs/ARCHITECTURE.md
docs/STAGE-8-VERIFICATION.md
src/app/executions/ExecutionPanel.tsx
src/app/executions/executionApi.ts
src/app/styles.css
src/app/workspaces/WorkspaceView.tsx
src/application/collaboration/orchestratorService.ts
src/application/executions/executionRepository.ts
src/application/executions/executionRuntime.ts
src/application/executions/executionService.ts
src/application/executions/localExecutionRuntime.ts
src/core/executions/execution.ts
src/server/httpServer.ts
src/storage/sqlite/migrations.ts
src/storage/sqlite/sqliteExecutionRepository.ts
tests/App.test.tsx
tests/ExecutionPanel.test.tsx
tests/execution.test.ts
tests/executionFixtures.ts
tests/executionPersistence.test.ts
tests/serverExecution.test.ts
tests/taskPersistence.test.ts
tsconfig.node.json
```
