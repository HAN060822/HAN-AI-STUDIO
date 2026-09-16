import type { ProviderAdapterDescriptor } from '../../core/providers/provider.ts';
import { ProviderAdapterRegistry } from './providerAdapterRegistry.ts';

const initialAdapterDescriptors = Object.freeze([
  { id: 'openai', providerId: 'openai', availability: 'unavailable', capabilities: ['text-input', 'text-output'] },
  { id: 'gemini', providerId: 'google', availability: 'unavailable', capabilities: ['text-input', 'text-output'] },
  { id: 'codex', providerId: 'codex', availability: 'unavailable', capabilities: ['text-input', 'text-output'] },
] satisfies readonly ProviderAdapterDescriptor[]);

export const initialProviderAdapterRegistry = new ProviderAdapterRegistry(
  initialAdapterDescriptors.map((descriptor) => ({ descriptor })),
);
