import type { AgentId } from '../agents/agent.ts';

export type ProviderId = 'openai' | 'google' | 'codex';
export type ProviderAdapterId = 'openai' | 'gemini' | 'codex';
export type ProviderBindingStatus = 'unconfigured' | 'configured';

export type ProviderBinding = Readonly<{
  providerId: ProviderId;
  adapterId: ProviderAdapterId;
  modelId: string | null;
  status: ProviderBindingStatus;
}>;

export type ProviderAvailability = 'available' | 'unavailable';
export type ProviderCapability = 'text-input' | 'text-output';

export type ProviderAdapterDescriptor = Readonly<{
  id: ProviderAdapterId;
  providerId: ProviderId;
  availability: ProviderAvailability;
  capabilities: readonly ProviderCapability[];
}>;

export type ProviderRequest<Extensions = never> = Readonly<{
  agentId: AgentId;
  input: string;
  extensions?: Extensions;
}>;

export type ProviderResponse<Extensions = never> = Readonly<{
  providerId: ProviderId;
  modelId: string;
  output: string;
  extensions?: Extensions;
}>;

export interface ProviderAdapter<RequestExtensions = never, ResponseExtensions = never> {
  readonly descriptor: ProviderAdapterDescriptor;
  execute(request: ProviderRequest<RequestExtensions>): Promise<ProviderResponse<ResponseExtensions>>;
}
