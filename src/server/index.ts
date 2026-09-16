import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { startStudioServer } from './httpServer.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const dev = process.argv.includes('--dev');
const host = process.env.HAN_AI_STUDIO_HOST ?? '127.0.0.1';
const port = Number(process.env.HAN_AI_STUDIO_PORT ?? 5173);
const dataDirectory = resolve(process.env.HAN_AI_STUDIO_DATA_DIR ?? 'var');
const databasePath = resolve(dataDirectory, 'studio.sqlite');
const providerMode = process.env.HAN_AI_STUDIO_PROVIDER_MODE === 'none' ? 'none' : 'mock';

const obsidianVaultRoot = process.env.HAN_AI_STUDIO_OBSIDIAN_VAULT || undefined;
const studio = await startStudioServer({ dev, host, port, databasePath, providerMode, obsidianVaultRoot });
console.log(`HAN's AI STUDIO ${dev ? 'development' : 'production'} server running at http://${host}:${port}`);
console.log(`Workspace database: ${databasePath}`);
console.log(`Provider mode: ${providerMode === 'mock' ? 'Mock test backend' : 'No executable provider'}`);
console.log(`Knowledge connector: ${obsidianVaultRoot ? 'Obsidian configured; review required before save' : 'Not configured; candidates remain local'}`);

let closing = false;
async function close(): Promise<void> {
  if (closing) return;
  closing = true;
  await studio.close();
  process.exit(0);
}

process.once('SIGINT', close);
process.once('SIGTERM', close);
