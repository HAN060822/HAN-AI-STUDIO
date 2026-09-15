import { resolve } from 'node:path';
import { startStudioServer } from './httpServer.ts';

const dev = process.argv.includes('--dev');
const host = process.env.HAN_AI_STUDIO_HOST ?? '127.0.0.1';
const port = Number(process.env.HAN_AI_STUDIO_PORT ?? 5173);
const dataDirectory = resolve(process.env.HAN_AI_STUDIO_DATA_DIR ?? 'var');
const databasePath = resolve(dataDirectory, 'studio.sqlite');

const studio = await startStudioServer({ dev, host, port, databasePath });
console.log(`HAN's AI STUDIO ${dev ? 'development' : 'production'} server running at http://${host}:${port}`);
console.log(`Workspace database: ${databasePath}`);

let closing = false;
async function close(): Promise<void> {
  if (closing) return;
  closing = true;
  await studio.close();
  process.exit(0);
}

process.once('SIGINT', close);
process.once('SIGTERM', close);
