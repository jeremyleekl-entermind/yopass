// Entermind Pass: the Yopass secret API on Cloudflare Workers.
//
// Re-implements the unlicensed, upload-free subset of pkg/server (routes in
// server.go HTTPHandler, wire contract in contract_test.go) so the rebranded
// React frontend in ../website can run without the Go server. Encryption is
// client-side (OpenPGP.js); this Worker only ever stores ciphertext.
//
// Everything not handled here (the SPA, /file/*, /request, /auth/*) falls
// through to the static assets, which 404 like the Go file server does.

import { CONFIG, EXPIRATIONS, MAX_MESSAGE_BYTES } from './config';
import { isPGPEncrypted } from './pgp';
import type { StoredSecret } from './secret-store';

export { SecretStore } from './secret-store';

const ID = '(?:[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}|[a-zA-Z0-9]{22})';
const SECRET_PATH = new RegExp(`^/secret/(${ID})$`);
const STATUS_PATH = new RegExp(`^/secret/(${ID})/status$`);

// jsonBodyLimit in pkg/server/response.go.
const BODY_LIMIT = MAX_MESSAGE_BYTES + Math.floor(MAX_MESSAGE_BYTES / 64) + 4096;

const CSP = [
  "default-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
].join('; ');

export default {
  async fetch(request, env): Promise<Response> {
    const response = await route(request, env);
    return withHeaders(response, new URL(request.url).protocol === 'https:');
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  const method = request.method;

  if (pathname === '/create/secret') {
    if (method === 'POST') return createSecret(request, env);
    if (method === 'OPTIONS') return preflight('POST, OPTIONS', 'Content-Type');
    return methodNotAllowed();
  }

  let match = STATUS_PATH.exec(pathname);
  if (match) {
    if (method !== 'GET') return methodNotAllowed();
    const status = await store(env, match[1]).status();
    if (!status) return notFound();
    return json(200, status, { 'Cache-Control': 'private, no-cache' });
  }

  match = SECRET_PATH.exec(pathname);
  if (match) {
    if (method === 'GET') {
      const secret = await store(env, match[1]).read();
      if (!secret) return notFound();
      return json(200, wireSecret(secret), {
        'Cache-Control': 'private, no-cache',
      });
    }
    if (method === 'DELETE') {
      const deleted = await store(env, match[1]).remove();
      return deleted ? new Response(null, { status: 204 }) : notFound();
    }
    return methodNotAllowed();
  }

  if (pathname === '/config') {
    if (method === 'GET') {
      return json(200, CONFIG, { 'Access-Control-Allow-Headers': 'content-type' });
    }
    if (method === 'OPTIONS') return preflight('GET, OPTIONS', '');
    return methodNotAllowed();
  }

  if (pathname === '/health' || pathname === '/ready') {
    if (method !== 'GET' && method !== 'HEAD') return methodNotAllowed();
    const status = pathname === '/health' ? 'healthy' : 'ready';
    return json(200, { status }, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  }

  if (pathname === '/version') {
    if (method !== 'GET') return methodNotAllowed();
    return json(200, { version: env.VERSION || 'unknown' });
  }

  return env.ASSETS.fetch(request);
}

async function createSecret(request: Request, env: Env): Promise<Response> {
  const raw = await readLimited(request, BODY_LIMIT);
  if (raw === null) return error(413, 'Request body too large');

  const body = parseSecretBody(raw);
  if (!body) return error(400, 'Unable to parse json');

  // Same order as createSecret + checkCreationPolicy in pkg/server.
  if (body.receipt) {
    return error(400, 'Read receipts are not enabled on this server');
  }
  if (!(EXPIRATIONS as readonly number[]).includes(body.expiration)) {
    return error(400, 'Invalid expiration specified');
  }
  if (body.require_auth) {
    return error(400, 'Authentication not configured on this server');
  }
  if (!body.one_time && CONFIG.FORCE_ONETIME_SECRETS) {
    return error(400, 'Secret must be one time download');
  }
  if (new TextEncoder().encode(body.message).length > MAX_MESSAGE_BYTES) {
    return error(400, 'The encrypted message is too long');
  }
  if (!isPGPEncrypted(body.message)) {
    return error(400, 'Message must be PGP encrypted');
  }

  const secret: StoredSecret = {
    message: body.message,
    expiration: body.expiration,
    one_time: body.one_time,
    expires_at: Date.now() + body.expiration * 1000,
  };
  // A 128-bit ID collision is not a practical concern; the retry only guards
  // against overwriting a live secret if one ever happens.
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = generateID();
    if (await store(env, id).create(secret)) return json(200, { message: id });
  }
  return error(500, 'Unable to generate ID');
}

interface SecretBody {
  message: string;
  expiration: number;
  one_time: boolean;
  require_auth: boolean;
  receipt: boolean;
}

// Accepts what Go's json.Decoder accepts for the Secret struct: absent or
// null fields take their zero value, a type mismatch is a parse error.
function parseSecretBody(raw: string): SecretBody | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (data === null) data = {};
  if (typeof data !== 'object' || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;

  const field = <T>(key: string, zero: T, ok: (v: unknown) => boolean) => {
    const value = obj[key];
    if (value === undefined || value === null) return zero;
    return ok(value) ? (value as T) : undefined;
  };
  const isBool = (v: unknown) => typeof v === 'boolean';
  const isInt32 = (v: unknown) =>
    Number.isInteger(v) && (v as number) >= -2147483648 && (v as number) <= 2147483647;

  const body = {
    message: field('message', '', v => typeof v === 'string'),
    expiration: field('expiration', 0, isInt32),
    one_time: field('one_time', false, isBool),
    require_auth: field('require_auth', false, isBool),
    receipt: field('receipt', false, isBool),
  };
  return Object.values(body).includes(undefined) ? null : (body as SecretBody);
}

// The JSON encoding of yopass.Secret: zero-valued omitempty fields are left out.
function wireSecret(secret: StoredSecret) {
  return {
    ...(secret.expiration ? { expiration: secret.expiration } : {}),
    message: secret.message,
    ...(secret.one_time ? { one_time: true } : {}),
  };
}

// yopass.GenerateID: 128 random bits as 22 base62 characters.
function generateID(): string {
  const charset =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let n = bytes.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
  let id = '';
  for (let i = 0; i < 22; i++) {
    id = charset[Number(n % 62n)] + id;
    n /= 62n;
  }
  return id;
}

function store(env: Env, id: string) {
  return env.SECRETS.get(env.SECRETS.idFromName(id));
}

async function readLimited(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length'));
  if (declared > limit) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body) + '\n', {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const error = (status: number, message: string) => json(status, { message });
const notFound = () => error(404, 'Secret not found');
const methodNotAllowed = () => new Response(null, { status: 405 });

function preflight(methods: string, headers: string) {
  const h: Record<string, string> = { 'Access-Control-Allow-Methods': methods };
  if (headers) h['Access-Control-Allow-Headers'] = headers;
  return new Response(null, { status: 200, headers: h });
}

// corsMiddleware (default --cors-allow-origin "*") and SecurityHeadersHandler.
function withHeaders(response: Response, https: boolean): Response {
  const out = new Response(response.body, response);
  out.headers.set('Access-Control-Allow-Origin', '*');
  out.headers.set('Content-Security-Policy', CSP);
  out.headers.set('Referrer-Policy', 'no-referrer');
  out.headers.set('X-Content-Type-Options', 'nosniff');
  out.headers.set('X-Frame-Options', 'DENY');
  out.headers.set('X-XSS-Protection', '1; mode=block');
  if (https) out.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return out;
}
