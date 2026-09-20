import { describe, expect, it, vi } from 'vitest';
import { collaborationContext, directContext, validateContext } from '../src/application/context/contextAssembler.ts';
import { OrchestratorService } from '../src/application/collaboration/orchestratorService.ts';
import type { AgentContribution, AgentHandoff, CollaborationPlan } from '../src/core/collaboration/collaboration.ts';
import type { ExecutionContextScope } from '../src/core/context/context.ts';

const plan: CollaborationPlan = { goal: 'Bounded goal', mode: 'sequential', steps: [{ id: 'step-1', agentId: 'agent-gpt' }, { id: 'step-2', agentId: 'agent-gemini' }] };
const scope: ExecutionContextScope = { workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-a', stepId: 'step-1' };
describe('Minimum sufficient Context packages', () => {
  it('assembles deterministic supplied text and metadata with unique snapshot identities and reference-only scope', () => {
    const a = collaborationContext(plan, plan.steps[0], null, undefined, scope);
    const b = collaborationContext(plan, plan.steps[0], null, undefined, scope);
    expect(a.input).toBe(b.input); expect(a.snapshot.items).toEqual(b.snapshot.items);
    expect(a.snapshot.inputFingerprint).toBe(b.snapshot.inputFingerprint); expect(a.snapshot.id).not.toBe(b.snapshot.id);
    expect(a.snapshot.items.find((item) => item.kind === 'goal')).toMatchObject({ sourceType: 'execution', sourceId: scope.executionId, reason: 'current-goal', suppliedChars: plan.goal.length });
    expect(a.snapshot.items.find((item) => item.kind === 'workspace')).toMatchObject({ delivery: 'reference-only', suppliedChars: 0 });
    expect(a.input).not.toContain(scope.workspaceId); expect(JSON.stringify(a.snapshot)).not.toContain(plan.goal);
    expect(a.snapshot.omitted).toContain('previous-contribution:unavailable-first-step'); validateContext(a, a.input);
  });
  it('keeps the 800-character immediate contribution bound and represents original size/truncation', () => {
    const previous: AgentContribution = { agentId: 'agent-gpt', agentDisplayName: 'GPT', providerId: 'mock', modelId: 'mock-basic', stepId: 'step-1', mode: 'mock', status: 'succeeded', handoff: null, output: 'x'.repeat(6000) };
    const handoff: AgentHandoff = { sourceAgentId: previous.agentId, targetAgentId: 'agent-gemini', originalGoal: plan.goal, relevantContribution: previous.output.slice(0, 800), contributionTruncated: true, requestedNextAction: 'Continue from this contribution.' };
    const context = collaborationContext(plan, plan.steps[1], handoff, previous, { ...scope, stepId: 'step-2' });
    expect(context.snapshot.items.find((item) => item.kind === 'handoff')).toMatchObject({ sourceId: scope.executionId, sourceStepId: 'step-1', originalChars: 6000, suppliedChars: 800, truncated: true });
    expect(context.input.length).toBeLessThanOrEqual(2000); expect(context.input).not.toContain('x'.repeat(801));
    expect(() => collaborationContext(plan, plan.steps[1], { ...handoff, contributionTruncated: false }, previous)).toThrow(/Context/);
  });
  it('measures UTF-16 characters separately from UTF-8 bytes and refuses invalid input/fingerprint/scope', () => {
    const context = directContext('知识🙂');
    expect(context.snapshot.inputChars).toBe(4); expect(context.snapshot.inputBytes).toBe(10);
    for (const value of ['', 'x'.repeat(2001)]) expect(() => directContext(value)).toThrow(/Context/);
    expect(() => validateContext({ ...context, input: 'different' }, context.input)).toThrow(/Context/);
    expect(() => validateContext({ ...context, snapshot: { ...context.snapshot, inputFingerprint: 'forged' } }, context.input)).toThrow(/Context/);
    expect(() => validateContext({ ...context, snapshot: { ...context.snapshot, omitted: ['DUMMY-private-payload'] } }, context.input)).toThrow(/Context/);
    expect(() => collaborationContext(plan, plan.steps[0], null, undefined, { ...scope, workspaceId: '../outside' })).toThrow(/Context/);
    expect(() => collaborationContext(plan, plan.steps[0], null, undefined, { ...scope, stepId: 'step-2' })).toThrow(/Context/);
  });
  it('excludes unrelated Chat, Knowledge, vault, Audit, secrets and hidden reasoning from construction', async () => {
    const forbidden = 'DUMMY-PRIVATE-NOT-CONTEXT';
    const invoke = vi.fn(async () => ({ agentId: 'agent-gpt' as const, agentDisplayName: 'GPT', providerId: 'mock', modelId: 'mock-basic', mode: 'mock' as const, status: 'succeeded' as const, output: 'safe' }));
    const orchestrator = new OrchestratorService({ assertInvokable() {}, invoke });
    await orchestrator.collaborate({ goal: 'Explicit goal only', collaborationMode: 'sequential', participantAgentIds: ['agent-gpt'], chatHistory: forbidden, knowledge: forbidden, obsidian: forbidden, audit: forbidden, secret: forbidden, reasoning: forbidden });
    expect(JSON.stringify(invoke.mock.calls)).not.toContain(forbidden);
    expect(invoke.mock.calls).toHaveLength(1);
  });
  it('keeps per-operation Workspace identity separate without loading any Workspace data', () => {
    const a = collaborationContext(plan, plan.steps[0], null, undefined, scope);
    const b = collaborationContext(plan, plan.steps[0], null, undefined, { ...scope, workspaceId: 'workspace-b', taskId: null, executionId: 'execution-b' });
    expect(a.input).toBe(b.input); expect(JSON.stringify(b.snapshot)).not.toContain('workspace-a'); expect(JSON.stringify(b.snapshot)).not.toContain('task-a');
    expect(b.snapshot.items).toHaveLength(4);
  });
});
