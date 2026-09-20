export const SECRET_REFS = ['provider.openai', 'provider.gemini', 'connector.github', 'engine.local'] as const;
export type SecretRef = typeof SECRET_REFS[number];
export type SecretStatus = Readonly<{ ref: SecretRef; status: 'configured' | 'unavailable' }>;
export class SecretError extends Error {
  readonly code: 'secret_unavailable' | 'secret_use_failed';
  constructor(code: 'secret_unavailable' | 'secret_use_failed') { super(code === 'secret_unavailable' ? 'Required Secret reference is unavailable. Capability did not execute.' : 'Secret-backed capability failed safely. No credential details are exposed.'); this.name = 'SecretError'; this.code = code; }
}
