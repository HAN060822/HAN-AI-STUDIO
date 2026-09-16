import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { URL } from 'node:url';
import { MockProviderAdapter, MOCK_MODEL_ID } from '../adapters/mock/mockProviderAdapter.ts';
import { AgentInvocationError, AgentInvocationService } from '../application/agents/agentInvocationService.ts';
import { initialAgentRegistry } from '../application/agents/initialAgentRegistry.ts';
import { ChatNotFoundError, ChatWorkspaceMismatchError, ConversationService, ConversationWorkspaceNotFoundError } from '../application/conversations/conversationService.ts';
import { initialProviderAdapterRegistry } from '../application/providers/initialProviderAdapterRegistry.ts';
import { ProviderAdapterRegistry, type ProviderAdapterRegistration } from '../application/providers/providerAdapterRegistry.ts';
import { TaskNotFoundError, TaskService, TaskSourceChatNotFoundError, TaskSourceChatWorkspaceMismatchError, TaskWorkspaceMismatchError, TaskWorkspaceNotFoundError } from '../application/tasks/taskService.ts';
import { WorkspaceNotFoundError, WorkspaceService } from '../application/workspaces/workspaceService.ts';
import { ConversationValidationError } from '../core/conversations/conversation.ts';
import { isTaskStatus, TaskValidationError } from '../core/tasks/task.ts';
import { WorkspaceValidationError } from '../core/workspaces/workspace.ts';
import type { AgentId } from '../core/agents/agent.ts';
import type { ProviderBinding } from '../core/providers/provider.ts';
import { SqliteConversationRepository } from '../storage/sqlite/sqliteConversationRepository.ts';
import { SqliteTaskRepository } from '../storage/sqlite/sqliteTaskRepository.ts';
import { SqliteWorkspaceRepository } from '../storage/sqlite/sqliteWorkspaceRepository.ts';

type StudioServerOptions = {
  host?: string;
  port?: number;
  databasePath: string;
  dev?: boolean;
  providerMode?: 'mock' | 'none';
};

type JsonRecord = Record<string, unknown>;

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new WorkspaceValidationError('Request body is too large.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed as JsonRecord;
  } catch {
    throw new WorkspaceValidationError('Request body must be valid JSON.');
  }
}

async function handleAgentApi(request: IncomingMessage, response: ServerResponse, service: AgentInvocationService, url: URL): Promise<boolean> {
  if (request.method === 'GET' && url.pathname === '/api/agents/invocation-targets') {
    sendJson(response, 200, { targets: service.listTargets() });
    return true;
  }
  const match = url.pathname.match(/^\/api\/agents\/([^/]+)\/invoke$/);
  if (!match) return false;
  try {
    if (request.method !== 'POST') { sendJson(response, 404, { error: 'Agent endpoint not found.' }); return true; }
    const body = await readJson(request);
    if (typeof body.input !== 'string') throw new AgentInvocationError('invalid_input', 'Input is required.');
    sendJson(response, 200, { result: await service.invoke(decodeURIComponent(match[1]), body.input) });
  } catch (error) {
    if (error instanceof AgentInvocationError) {
      const status = error.code === 'unknown_agent' ? 404 : error.code === 'invalid_input' ? 400 : error.code === 'provider_request_failed' || error.code === 'malformed_provider_response' ? 502 : 409;
      sendJson(response, status, { error: error.message, code: error.code });
    } else {
      console.error('Agent invocation failed safely.');
      sendJson(response, 500, { error: 'Agent invocation is unavailable.', code: 'invocation_unavailable' });
    }
  }
  return true;
}

function stringOrNull(value: unknown): string | null | undefined {
  return typeof value === 'string' || value === null ? value : undefined;
}

async function handleConversationApi(request: IncomingMessage, response: ServerResponse, service: ConversationService, url: URL): Promise<boolean> {
  const baseMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/chats(?:\/([^/]+)(?:\/(messages))?)?$/);
  if (!baseMatch) return false;

  const workspaceId = decodeURIComponent(baseMatch[1]);
  const chatId = baseMatch[2] ? decodeURIComponent(baseMatch[2]) : undefined;
  const resource = baseMatch[3];

  try {
    if (!chatId && !resource && request.method === 'GET') {
      sendJson(response, 200, { chats: service.listChatsForWorkspace(workspaceId) });
      return true;
    }
    if (!chatId && !resource && request.method === 'POST') {
      const body = await readJson(request);
      sendJson(response, 201, { chat: service.createChat(workspaceId, typeof body.title === 'string' ? body.title : 'New chat') });
      return true;
    }
    if (chatId && !resource && request.method === 'GET') {
      sendJson(response, 200, { chat: service.getChat(workspaceId, chatId) });
      return true;
    }
    if (chatId && !resource && request.method === 'PATCH') {
      const body = await readJson(request);
      if (typeof body.title !== 'string') throw new ConversationValidationError('Chat title is required.');
      sendJson(response, 200, { chat: service.renameChat(workspaceId, chatId, body.title) });
      return true;
    }
    if (chatId && resource === 'messages' && request.method === 'GET') {
      sendJson(response, 200, { messages: service.listMessages(workspaceId, chatId) });
      return true;
    }
    if (chatId && resource === 'messages' && request.method === 'POST') {
      const body = await readJson(request);
      if (typeof body.content !== 'string') throw new ConversationValidationError('Message content is required.');
      sendJson(response, 201, { message: service.addHumanMessage(workspaceId, chatId, body.content) });
      return true;
    }
    sendJson(response, 404, { error: 'Conversation endpoint not found.' });
  } catch (error) {
    if (error instanceof ConversationValidationError || error instanceof WorkspaceValidationError) sendJson(response, 400, { error: error.message });
    else if (error instanceof ConversationWorkspaceNotFoundError || error instanceof ChatNotFoundError || error instanceof ChatWorkspaceMismatchError) sendJson(response, 404, { error: error.message });
    else {
      console.error('Conversation persistence request failed:', error);
      sendJson(response, 500, { error: 'Conversation persistence is unavailable. Your change was not saved.' });
    }
  }
  return true;
}

async function handleTaskApi(request: IncomingMessage, response: ServerResponse, service: TaskService, url: URL): Promise<boolean> {
  const match = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/tasks(?:\/([^/]+))?$/);
  if (!match) return false;
  const workspaceId = decodeURIComponent(match[1]);
  const taskId = match[2] ? decodeURIComponent(match[2]) : undefined;

  try {
    if (!taskId && request.method === 'GET') {
      const sourceChatId = url.searchParams.get('sourceChatId') ?? undefined;
      sendJson(response, 200, { tasks: service.listTasksForWorkspace(workspaceId, sourceChatId) });
      return true;
    }
    if (!taskId && request.method === 'POST') {
      const body = await readJson(request);
      if (typeof body.title !== 'string') throw new TaskValidationError('Task title is required.');
      if (typeof body.goal !== 'string') throw new TaskValidationError('Task goal is required.');
      if (body.sourceChatId !== undefined && body.sourceChatId !== null && typeof body.sourceChatId !== 'string') throw new TaskValidationError('Source chat ID must be a string or null.');
      sendJson(response, 201, { task: service.createTask(workspaceId, { title: body.title, goal: body.goal, sourceChatId: body.sourceChatId as string | null | undefined }) });
      return true;
    }
    if (taskId && request.method === 'GET') {
      sendJson(response, 200, { task: service.getTask(workspaceId, taskId) });
      return true;
    }
    if (taskId && request.method === 'PATCH') {
      const body = await readJson(request);
      if (body.title !== undefined && typeof body.title !== 'string') throw new TaskValidationError('Task title must be a string.');
      if (body.goal !== undefined && typeof body.goal !== 'string') throw new TaskValidationError('Task goal must be a string.');
      if (body.status !== undefined && !isTaskStatus(body.status)) throw new TaskValidationError('Task status is invalid.');
      if (body.title === undefined && body.goal === undefined && body.status === undefined) throw new TaskValidationError('At least one Task field is required.');
      sendJson(response, 200, { task: service.updateTask(workspaceId, taskId, { title: body.title as string | undefined, goal: body.goal as string | undefined, status: isTaskStatus(body.status) ? body.status : undefined }) });
      return true;
    }
    sendJson(response, 404, { error: 'Task endpoint not found.' });
  } catch (error) {
    if (error instanceof TaskValidationError || error instanceof WorkspaceValidationError) sendJson(response, 400, { error: error.message });
    else if (error instanceof TaskWorkspaceNotFoundError || error instanceof TaskNotFoundError || error instanceof TaskWorkspaceMismatchError || error instanceof TaskSourceChatNotFoundError || error instanceof TaskSourceChatWorkspaceMismatchError) sendJson(response, 404, { error: error.message });
    else {
      console.error('Task persistence request failed:', error);
      sendJson(response, 500, { error: 'Task persistence is unavailable. Your change was not saved.' });
    }
  }
  return true;
}

async function handleWorkspaceApi(request: IncomingMessage, response: ServerResponse, service: WorkspaceService, url: URL): Promise<boolean> {
  if (!url.pathname.startsWith('/api/workspaces')) return false;

  try {
    if (request.method === 'GET' && url.pathname === '/api/workspaces') {
      sendJson(response, 200, { workspaces: service.listWorkspaces(url.searchParams.get('includeArchived') === 'true') });
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/workspaces') {
      const body = await readJson(request);
      sendJson(response, 201, { workspace: service.createWorkspace({
        name: typeof body.name === 'string' ? body.name : '',
        description: stringOrNull(body.description),
      }) });
      return true;
    }

    const match = url.pathname.match(/^\/api\/workspaces\/([^/]+)(?:\/(archive|restore))?$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const action = match[2];
      if (request.method === 'GET' && !action) {
        sendJson(response, 200, { workspace: service.getWorkspace(id) });
        return true;
      }
      if (request.method === 'PATCH' && !action) {
        const body = await readJson(request);
        sendJson(response, 200, { workspace: service.updateWorkspace(id, {
          name: typeof body.name === 'string' ? body.name : undefined,
          description: stringOrNull(body.description),
        }) });
        return true;
      }
      if (request.method === 'POST' && action === 'archive') {
        sendJson(response, 200, { workspace: service.archiveWorkspace(id) });
        return true;
      }
      if (request.method === 'POST' && action === 'restore') {
        sendJson(response, 200, { workspace: service.restoreWorkspace(id) });
        return true;
      }
    }

    sendJson(response, 404, { error: 'Workspace endpoint not found.' });
  } catch (error) {
    if (error instanceof WorkspaceValidationError) sendJson(response, 400, { error: error.message });
    else if (error instanceof WorkspaceNotFoundError) sendJson(response, 404, { error: error.message });
    else {
      console.error('Workspace persistence request failed:', error);
      sendJson(response, 500, { error: 'Workspace persistence is unavailable. Your change was not saved.' });
    }
  }
  return true;
}

async function serveProductionFile(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const root = resolve('dist');
  const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://local').pathname);
  const requestedFile = extname(requestPath) ? resolve(root, `.${requestPath}`) : join(root, 'index.html');
  if (requestedFile !== root && !requestedFile.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  const file = existsSync(requestedFile) ? requestedFile : join(root, 'index.html');
  try {
    const info = await stat(file);
    response.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'application/octet-stream', 'content-length': info.size });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Production build not found. Run npm run build first.');
  }
}

export async function startStudioServer(options: StudioServerOptions) {
  const repository = new SqliteWorkspaceRepository(options.databasePath);
  const workspaceService = new WorkspaceService(repository);
  const conversationRepository = new SqliteConversationRepository(options.databasePath);
  const conversationService = new ConversationService(conversationRepository, repository);
  const taskRepository = new SqliteTaskRepository(options.databasePath);
  const taskService = new TaskService(taskRepository, repository, conversationRepository);
  const registrations: ProviderAdapterRegistration[] = initialProviderAdapterRegistry.listDescriptors().map((descriptor) => ({ descriptor }));
  const bindings = new Map<AgentId, ProviderBinding>();
  if ((options.providerMode ?? 'mock') === 'mock') {
    const mock = new MockProviderAdapter();
    registrations.push({ descriptor: mock.descriptor, adapter: mock });
    bindings.set('agent-gpt', { providerId: 'mock', adapterId: 'mock', modelId: MOCK_MODEL_ID, status: 'configured' });
  }
  const agentInvocationService = new AgentInvocationService(initialAgentRegistry, new ProviderAdapterRegistry(registrations), bindings);
  const vite = options.dev
    ? await (await import('vite')).createServer({ server: { middlewareMode: true }, appType: 'spa' })
    : null;

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (await handleAgentApi(request, response, agentInvocationService, url)) return;
    if (await handleTaskApi(request, response, taskService, url)) return;
    if (await handleConversationApi(request, response, conversationService, url)) return;
    if (await handleWorkspaceApi(request, response, workspaceService, url)) return;
    if (vite) {
      vite.middlewares(request, response, (error?: unknown) => {
        if (error) {
          console.error('Development server failed:', error);
          response.writeHead(500).end('Development server error.');
        }
      });
      return;
    }
    await serveProductionFile(request, response);
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 5173, options.host ?? '127.0.0.1', resolvePromise);
  });

  return {
    server,
    close: async () => {
      await vite?.close();
      await new Promise<void>((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()));
      repository.close();
      conversationRepository.close();
      taskRepository.close();
    },
  };
}
