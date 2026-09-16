import { AGENT_SCHEMA_VERSION, type Agent } from '../../core/agents/agent.ts';
import { AgentRegistry } from './agentRegistry.ts';

const initialAgents = Object.freeze([
  {
    id: 'agent-gpt',
    identityKey: 'gpt',
    displayName: 'GPT',
    roleSummary: 'Supports architecture, coordination, synthesis, and general reasoning.',
    status: 'unavailable',
    capabilities: ['reasoning', 'architecture', 'coordination', 'synthesis'],
    providerBinding: { providerId: 'openai', adapterId: 'openai', modelId: null, status: 'unconfigured' },
    schemaVersion: AGENT_SCHEMA_VERSION,
  },
  {
    id: 'agent-gemini',
    identityKey: 'gemini',
    displayName: 'Gemini',
    roleSummary: 'Supports research, synthesis, alternative reasoning, and Google ecosystem work.',
    status: 'unavailable',
    capabilities: ['reasoning', 'research', 'synthesis', 'google-ecosystem'],
    providerBinding: { providerId: 'google', adapterId: 'gemini', modelId: null, status: 'unconfigured' },
    schemaVersion: AGENT_SCHEMA_VERSION,
  },
  {
    id: 'agent-codex',
    identityKey: 'codex',
    displayName: 'Codex',
    roleSummary: 'Supports software engineering, repository work, terminal workflows, and testing.',
    status: 'unavailable',
    capabilities: ['software-engineering', 'repository', 'terminal', 'testing'],
    providerBinding: { providerId: 'codex', adapterId: 'codex', modelId: null, status: 'unconfigured' },
    schemaVersion: AGENT_SCHEMA_VERSION,
  },
] satisfies readonly Agent[]);

export const initialAgentRegistry = new AgentRegistry(initialAgents);
