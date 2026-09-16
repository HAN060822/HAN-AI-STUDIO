import type { Agent, AgentCapability, AgentId } from '../../core/agents/agent.ts';

export class AgentRegistry {
  readonly #agents: readonly Agent[];
  readonly #byId: ReadonlyMap<AgentId, Agent>;

  constructor(agents: readonly Agent[]) {
    const byId = new Map<AgentId, Agent>();
    for (const agent of agents) {
      if (byId.has(agent.id)) throw new Error(`Duplicate Agent ID: ${agent.id}`);
      byId.set(agent.id, agent);
    }
    this.#agents = Object.freeze([...agents]);
    this.#byId = byId;
  }

  list(): readonly Agent[] {
    return this.#agents;
  }

  resolve(id: AgentId | string): Agent | null {
    return this.#byId.get(id as AgentId) ?? null;
  }

  withCapability(capability: AgentCapability): readonly Agent[] {
    return this.#agents.filter((agent) => agent.capabilities.includes(capability));
  }
}
