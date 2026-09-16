import type { AgentId } from '../../core/agents/agent.ts';
import type { ProviderBinding, ProviderResponse } from '../../core/providers/provider.ts';
import type { AgentRegistry } from './agentRegistry.ts';
import type { ProviderAdapterRegistry } from '../providers/providerAdapterRegistry.ts';

export type AgentInvocationTarget = Readonly<{ agentId: AgentId; displayName: string; backendMode: 'mock' | 'real'; providerId: string; modelId: string }>;
export type AgentInvocationResult = Readonly<{ agentId: AgentId; agentDisplayName: string; providerId: string; modelId: string; mode: 'mock' | 'real'; status: 'succeeded'; output: string }>;

export class AgentInvocationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; this.name = 'AgentInvocationError'; }
}
export class UnknownAgentError extends AgentInvocationError { constructor() { super('unknown_agent', 'Agent was not found.'); } }
export class AgentUnavailableError extends AgentInvocationError { constructor() { super('agent_unavailable', 'Agent has no configured invocation backend.'); } }
export class BindingUnconfiguredError extends AgentInvocationError { constructor() { super('binding_unconfigured', 'Agent provider binding is not configured.'); } }
export class AdapterUnavailableError extends AgentInvocationError { constructor() { super('adapter_unavailable', 'Configured provider adapter is unavailable.'); } }
export class ProviderRequestFailedError extends AgentInvocationError { constructor() { super('provider_request_failed', 'Provider request failed safely.'); } }
export class MalformedProviderResponseError extends AgentInvocationError { constructor() { super('malformed_provider_response', 'Provider returned an invalid response.'); } }
export class InvalidAgentInputError extends AgentInvocationError { constructor() { super('invalid_input', 'Input must contain between 1 and 2,000 characters.'); } }

export class AgentInvocationService {
  private readonly agents: AgentRegistry;
  private readonly adapters: ProviderAdapterRegistry;
  private readonly bindings: ReadonlyMap<AgentId, ProviderBinding>;
  constructor(
    agents: AgentRegistry,
    adapters: ProviderAdapterRegistry,
    bindings: ReadonlyMap<AgentId, ProviderBinding>,
  ) { this.agents = agents; this.adapters = adapters; this.bindings = bindings; }

  listTargets(): readonly AgentInvocationTarget[] {
    return [...this.bindings.entries()].flatMap(([agentId, binding]) => {
      const agent = this.agents.resolve(agentId);
      const descriptor = this.adapters.resolveDescriptor(binding.adapterId);
      if (!agent || !descriptor || descriptor.availability !== 'available' || binding.status !== 'configured' || !binding.modelId || !this.adapters.resolve(binding.adapterId)) return [];
      return [{ agentId, displayName: agent.displayName, backendMode: descriptor.providerId === 'mock' ? 'mock' : 'real', providerId: descriptor.providerId, modelId: binding.modelId }];
    });
  }

  assertInvokable(agentId: string): void {
    this.resolveInvocation(agentId);
  }

  private resolveInvocation(agentId: string) {
    const agent = this.agents.resolve(agentId);
    if (!agent) throw new UnknownAgentError();
    const binding = this.bindings.get(agent.id);
    if (!binding) throw new AgentUnavailableError();
    if (binding.status !== 'configured' || !binding.modelId) throw new BindingUnconfiguredError();
    const descriptor = this.adapters.resolveDescriptor(binding.adapterId);
    const adapter = this.adapters.resolve(binding.adapterId);
    if (!descriptor || descriptor.availability !== 'available' || !adapter) throw new AdapterUnavailableError();
    return { agent, binding, adapter };
  }

  async invoke(agentId: string, input: string): Promise<AgentInvocationResult> {
    const { agent, binding, adapter } = this.resolveInvocation(agentId);
    const normalizedInput = input.trim();
    if (!normalizedInput || normalizedInput.length > 2000) throw new InvalidAgentInputError();
    let response: ProviderResponse<unknown>;
    try { response = await adapter.execute({ agentId: agent.id, input: normalizedInput }); }
    catch { throw new ProviderRequestFailedError(); }
    if (!response || response.agentId !== agent.id || response.providerId !== binding.providerId || response.modelId !== binding.modelId || response.mode !== (binding.providerId === 'mock' ? 'mock' : 'real') || response.status !== 'succeeded' || typeof response.output !== 'string' || !response.output.trim()) throw new MalformedProviderResponseError();
    return { agentId: agent.id, agentDisplayName: agent.displayName, providerId: response.providerId, modelId: response.modelId, mode: response.mode, status: response.status, output: response.output };
  }
}
