import { SECRET_REFS, SecretError, type SecretRef, type SecretStatus } from '../../core/secrets/secret.ts';
import type { SecretProvider } from '../../application/secrets/secretProvider.ts';
const environmentKeys: Record<SecretRef, readonly string[]> = {
  'provider.openai': ['HAN_AI_STUDIO_SECRET_OPENAI', 'OPENAI_API_KEY'],
  'provider.gemini': ['HAN_AI_STUDIO_SECRET_GEMINI'],
  'connector.github': ['HAN_AI_STUDIO_SECRET_GITHUB'],
  'engine.local': ['HAN_AI_STUDIO_SECRET_ENGINE'],
};
export class EnvironmentSecretProvider implements SecretProvider {
  #environment: Readonly<Record<string, string | undefined>>;
  constructor(environment: Readonly<Record<string, string | undefined>> = process.env) { this.#environment = environment; }
  #resolve(ref: SecretRef): string | undefined {
    for (const key of environmentKeys[ref]) {
      const value = this.#environment[key]?.trim();
      if (value) return value;
    }
    return undefined;
  }
  status(): SecretStatus[] { return SECRET_REFS.map((ref) => ({ ref, status: this.#resolve(ref) ? 'configured' : 'unavailable' })); }
  use(ref: SecretRef, consume: (value: string) => void): void {
    if (!SECRET_REFS.includes(ref)) throw new SecretError('secret_unavailable');
    const value = this.#resolve(ref);
    if (!value) throw new SecretError('secret_unavailable');
    try { consume(value); } catch { throw new SecretError('secret_use_failed'); }
  }
}
