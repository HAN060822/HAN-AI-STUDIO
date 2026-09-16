import type { ProviderBinding } from '../providers/provider.ts';

export const AGENT_SCHEMA_VERSION = 1 as const;

export type AgentId = 'agent-gpt' | 'agent-gemini' | 'agent-codex';
export type AgentIdentityKey = 'gpt' | 'gemini' | 'codex';
export type AgentStatus = 'standby' | 'unavailable';
export type AgentCapability =
  | 'reasoning'
  | 'research'
  | 'architecture'
  | 'coordination'
  | 'synthesis'
  | 'google-ecosystem'
  | 'software-engineering'
  | 'repository'
  | 'terminal'
  | 'testing';

export type Agent = Readonly<{
  id: AgentId;
  identityKey: AgentIdentityKey;
  displayName: string;
  roleSummary: string;
  status: AgentStatus;
  capabilities: readonly AgentCapability[];
  providerBinding: ProviderBinding;
  schemaVersion: number;
}>;
