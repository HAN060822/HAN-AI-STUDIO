import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { LOCAL_HAN, type Actor } from '../core/governance/governance.ts';

// Local-owner transport / CSRF boundary, not user authentication or protection from local malware.
export class LocalAuthority {
  #session = randomBytes(32).toString('hex');
  actor(request: IncomingMessage, requireSession = false): Actor | null {
    const peer = request.socket.remoteAddress;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer ?? '')) return null;
    const port = request.socket.localPort;
    const host = request.headers.host;
    if (!host || ![`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(host)) return null;
    const origin = request.headers.origin;
    if (origin !== undefined && origin !== `http://${host}`) return null;
    const site = request.headers['sec-fetch-site'];
    if (site !== undefined && site !== 'same-origin' && site !== 'none') return null;
    if (requireSession) {
      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) return null;
      const supplied = request.headers['x-han-session'];
      if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(this.#session))) return null;
    }
    return LOCAL_HAN;
  }
  session(request: IncomingMessage): string | null { return this.actor(request) ? this.#session : null; }
}
