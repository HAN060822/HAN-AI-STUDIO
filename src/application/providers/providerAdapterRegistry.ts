import type { ProviderAdapter, ProviderAdapterDescriptor, ProviderAdapterId } from '../../core/providers/provider.ts';

export type ProviderAdapterRegistration = Readonly<{
  descriptor: ProviderAdapterDescriptor;
  adapter?: ProviderAdapter<unknown, unknown>;
}>;

export class ProviderAdapterRegistry {
  readonly #registrations: ReadonlyMap<ProviderAdapterId, ProviderAdapterRegistration>;

  constructor(registrations: readonly ProviderAdapterRegistration[]) {
    const byId = new Map<ProviderAdapterId, ProviderAdapterRegistration>();
    for (const registration of registrations) {
      if (byId.has(registration.descriptor.id)) throw new Error(`Duplicate Provider Adapter ID: ${registration.descriptor.id}`);
      if (registration.adapter && registration.adapter.descriptor.id !== registration.descriptor.id) throw new Error('Provider Adapter registration ID mismatch.');
      byId.set(registration.descriptor.id, registration);
    }
    this.#registrations = byId;
  }

  listDescriptors(): readonly ProviderAdapterDescriptor[] {
    return [...this.#registrations.values()].map(({ descriptor }) => descriptor);
  }

  resolveDescriptor(id: ProviderAdapterId | string): ProviderAdapterDescriptor | null {
    return this.#registrations.get(id as ProviderAdapterId)?.descriptor ?? null;
  }

  resolve(id: ProviderAdapterId | string): ProviderAdapter<unknown, unknown> | null {
    return this.#registrations.get(id as ProviderAdapterId)?.adapter ?? null;
  }
}
