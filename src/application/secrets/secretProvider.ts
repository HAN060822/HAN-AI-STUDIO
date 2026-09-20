import type { SecretRef, SecretStatus } from '../../core/secrets/secret.ts';
export interface SecretProvider {
  status(): SecretStatus[];
  // Trusted synchronous server consumer. Discard its return value; this is not a sandbox.
  use(ref: SecretRef, consume: (value: string) => void): void;
}
