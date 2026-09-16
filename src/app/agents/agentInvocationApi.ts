import type { AgentInvocationResult, AgentInvocationTarget } from '../../application/agents/agentInvocationService.ts';

async function read<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Agent invocation is unavailable.');
  return body;
}

export async function listInvocationTargets(): Promise<readonly AgentInvocationTarget[]> {
  return (await read<{ targets: AgentInvocationTarget[] }>(await fetch('/api/agents/invocation-targets'))).targets;
}

export async function invokeAgent(agentId: string, input: string): Promise<AgentInvocationResult> {
  return (await read<{ result: AgentInvocationResult }>(await fetch(`/api/agents/${encodeURIComponent(agentId)}/invoke`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }),
  }))).result;
}
