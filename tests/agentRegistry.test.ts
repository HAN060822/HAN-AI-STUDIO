import { describe, expect, it } from 'vitest';
import { initialAgentRegistry } from '../src/application/agents/initialAgentRegistry.ts';

describe('Agent Registry', () => {
  it('exposes exactly the three stable AI Studio Agent identities', () => {
    expect(initialAgentRegistry.list().map(({ id, displayName }) => ({ id, displayName }))).toEqual([
      { id: 'agent-gpt', displayName: 'GPT' },
      { id: 'agent-gemini', displayName: 'Gemini' },
      { id: 'agent-codex', displayName: 'Codex' },
    ]);
    expect(initialAgentRegistry.resolve('agent-gpt')?.identityKey).toBe('gpt');
    expect(initialAgentRegistry.resolve('agent-gemini')?.identityKey).toBe('gemini');
    expect(initialAgentRegistry.resolve('agent-codex')?.identityKey).toBe('codex');
  });

  it('keeps Agent identity separate from inspectable Provider and Model bindings', () => {
    for (const agent of initialAgentRegistry.list()) {
      expect(agent.providerBinding.providerId).not.toBe(agent.id);
      expect(agent.providerBinding.adapterId).not.toBe(agent.id);
      expect(agent.providerBinding.modelId).toBeNull();
      expect(agent.providerBinding.status).toBe('unconfigured');
      expect(agent.status).toBe('unavailable');
    }
  });

  it('provides machine-readable, queryable capabilities and safe unknown resolution', () => {
    expect(initialAgentRegistry.resolve('missing-agent')).toBeNull();
    expect(initialAgentRegistry.resolve('agent-codex')?.capabilities).toEqual(expect.arrayContaining(['software-engineering', 'repository', 'terminal', 'testing']));
    expect(initialAgentRegistry.withCapability('synthesis').map((agent) => agent.id)).toEqual(['agent-gpt', 'agent-gemini']);
  });
});
