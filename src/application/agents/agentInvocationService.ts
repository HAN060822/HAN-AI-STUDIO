import type { AgentId } from '../../core/agents/agent.ts';
import type { ProviderBinding, ProviderResponse } from '../../core/providers/provider.ts';
import type { AgentRegistry } from './agentRegistry.ts';
import type { ProviderAdapterRegistry } from '../providers/providerAdapterRegistry.ts';
import { randomUUID } from 'node:crypto';
import { directContext, validateContext } from '../context/contextAssembler.ts';
import type { ContextPackage } from '../../core/context/context.ts';
import { normalizeUsage, unavailableUsage, type InvocationMeasurement, type TelemetryRecord } from '../../core/telemetry/telemetry.ts';
import type { TelemetryRepository } from '../telemetry/telemetryRepository.ts';

export type AgentInvocationTarget = Readonly<{ agentId: AgentId; displayName: string; backendMode: 'mock' | 'real'; providerId: string; modelId: string }>;
export type AgentInvocationResult = Readonly<{ agentId: AgentId; agentDisplayName: string; providerId: string; modelId: string; mode: 'mock' | 'real'; status: 'succeeded'; output: string; measurement?: InvocationMeasurement }>;

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
  private readonly telemetry?: TelemetryRepository;
  constructor(
    agents: AgentRegistry,
    adapters: ProviderAdapterRegistry,
    bindings: ReadonlyMap<AgentId, ProviderBinding>,
    telemetry?: TelemetryRepository,
  ) { this.agents = agents; this.adapters = adapters; this.bindings = bindings; this.telemetry = telemetry; }

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

  async invoke(agentId: string, input: string, context?: ContextPackage): Promise<AgentInvocationResult> {
    const { agent, binding, adapter } = this.resolveInvocation(agentId);
    const normalizedInput = input.trim();
    if (!normalizedInput || normalizedInput.length > 2000) throw new InvalidAgentInputError();
    let supplied: ContextPackage;
    try { supplied = context ?? directContext(normalizedInput); validateContext(supplied, normalizedInput); }
    catch { throw new AgentInvocationError('invalid_context', 'Context is invalid or exceeds the operation bounds. No provider call was made.'); }
    const invocationId = randomUUID();
    const startedAt = new Date().toISOString();
    const mode = binding.providerId === 'mock' ? 'mock' : 'real';
    const record: TelemetryRecord = { invocationId, phase: 'started', schemaVersion: 1, agentId: agent.id, providerId: binding.providerId, modelId: binding.modelId!, mode,
      context: structuredClone(supplied.snapshot), startedAt, completedAt: null, durationMs: null, status: 'started', code: 'ok', usage: unavailableUsage, cost: null };
    const persist = supplied.snapshot.scope !== null && this.telemetry !== undefined;
    if (persist) {
      try { this.telemetry!.append(record); }
      catch { throw new AgentInvocationError('telemetry_unavailable', 'Invocation telemetry could not be started. No provider call was made; this is not an authority denial.'); }
    }
    const start = performance.now();
    const finish = (status: 'succeeded' | 'failed', code: TelemetryRecord['code'], usage = unavailableUsage): InvocationMeasurement => {
      const completedAt = new Date().toISOString();
      const durationMs = Math.max(0, performance.now() - start);
      let telemetry: InvocationMeasurement['telemetry'] = 'not-recorded';
      if (persist) {
        try { this.telemetry!.append({ ...record, phase: 'final', completedAt, durationMs, status, code, usage }); telemetry = 'persisted'; }
        catch { telemetry = 'unconfirmed'; } // Keep the successful contribution; unmatched start remains honest uncertainty.
      }
      return { invocationId, contextId: supplied.snapshot.id, startedAt, completedAt, durationMs, usage, cost: null, telemetry };
    };
    let response: ProviderResponse<unknown>;
    try { response = await adapter.execute({ agentId: agent.id, input: normalizedInput, invocationId, contextId: supplied.snapshot.id }); }
    catch { finish('failed', 'provider_request_failed'); throw new ProviderRequestFailedError(); }
    if (!response || response.agentId !== agent.id || response.providerId !== binding.providerId || response.modelId !== binding.modelId || response.mode !== mode || response.status !== 'succeeded' || typeof response.output !== 'string' || !response.output.trim()) {
      finish('failed', 'malformed_provider_response'); throw new MalformedProviderResponseError();
    }
    const measurement = finish('succeeded', 'ok', normalizeUsage(response.usage, mode));
    return { agentId: agent.id, agentDisplayName: agent.displayName, providerId: response.providerId, modelId: response.modelId, mode: response.mode, status: response.status, output: response.output, measurement };
  }
}
