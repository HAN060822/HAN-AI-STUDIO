import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { URL } from 'node:url';
import { WorkspaceNotFoundError, WorkspaceService } from '../application/workspaces/workspaceService.ts';
import { WorkspaceValidationError } from '../core/workspaces/workspace.ts';
import { SqliteWorkspaceRepository } from '../storage/sqlite/sqliteWorkspaceRepository.ts';

type StudioServerOptions = {
  host?: string;
  port?: number;
  databasePath: string;
  dev?: boolean;
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

function stringOrNull(value: unknown): string | null | undefined {
  return typeof value === 'string' || value === null ? value : undefined;
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
  const service = new WorkspaceService(repository);
  const vite = options.dev
    ? await (await import('vite')).createServer({ server: { middlewareMode: true }, appType: 'spa' })
    : null;

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (await handleWorkspaceApi(request, response, service, url)) return;
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
    },
  };
}
