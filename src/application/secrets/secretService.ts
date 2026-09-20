import type { Actor, ActionIntent, Scope } from '../../core/governance/governance.ts';
import { SECRET_REFS, SecretError, type SecretRef } from '../../core/secrets/secret.ts';
import type { GovernanceService } from '../governance/governanceService.ts';
import type { SecretProvider } from './secretProvider.ts';
// This seam is exercised with dummy secrets, not connected to a real provider in Stage 11.
export class SecretService {
  private readonly provider: SecretProvider;
  private readonly governance: GovernanceService;
  constructor(provider: SecretProvider, governance: GovernanceService) { this.provider = provider; this.governance = governance; }
  use(actor: Actor | null, ref: SecretRef, scope: Scope, approved: boolean, consume: (value: string) => void): void {
    if (!SECRET_REFS.includes(ref)) throw new SecretError('secret_unavailable');
    const intent: ActionIntent = { action: 'EXECUTE', resource: { type: 'secret', id: ref }, scope, consequence: { capability: 'secret.use', destinationId: 'server-only', fingerprint: ref } };
    const failure = this.governance.run(actor, intent, approved, () => {
      try { this.provider.use(ref, consume); return { value: null, outcome: 'succeeded', code: 'ok' }; }
      catch (error) { const code = error instanceof SecretError ? error.code : 'secret_use_failed'; return { value: new SecretError(code), outcome: 'failed', code }; }
    });
    if (failure) throw failure;
  }
}
