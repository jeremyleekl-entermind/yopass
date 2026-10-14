// Contract tests ported from pkg/server/contract_test.go (unlicensed server,
// uploads disabled), plus the guarantees the Durable Object design must keep:
// one-time secrets are readable exactly once, and secrets expire.

import { env, exports } from 'cloudflare:workers';
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { isPGPEncrypted } from '../src/pgp';
import type { SecretStore, StoredSecret } from '../src/secret-store';

// contractPGPMessage in pkg/server/contract_test.go (OpenPGP.js output).
const PGP = `-----BEGIN PGP MESSAGE-----
Version: OpenPGP.js v4.10.8
Comment: https://openpgpjs.org

wy4ECQMIRthQ3aO85NvgAfASIX3dTwsFVt0gshPu7n1tN05e8rpqxOk6PYNm
xtt90k4BqHuTCLNlFRJjuiuE8zdIc+j5zTN5zihxUReVqokeqULLOx2FBMHZ
sbfqaG/iDbp+qDOc98IagMyPrEqKDxnhVVOraXy5dD9RDsntLso=
=0vwU
-----END PGP MESSAGE-----`;

const BASE = 'https://pass.test';
const call = (path: string, init?: RequestInit) =>
  exports.default.fetch(new Request(BASE + path, init));

const post = (body: unknown) =>
  call('/create/secret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

async function create(overrides: Record<string, unknown> = {}) {
  const res = await post({
    message: PGP,
    expiration: 3600,
    one_time: true,
    ...overrides,
  });
  expect(res.status).toBe(200);
  const { message: id } = (await res.json()) as { message: string };
  return id;
}

describe('route contract (default unlicensed, uploads disabled)', () => {
  it('creates, reads, checks status and deletes a secret', async () => {
    const id = await create({ one_time: false });
    expect(id).toMatch(/^[a-zA-Z0-9]{22}$/);

    const status = await call(`/secret/${id}/status`);
    expect(status.status).toBe(200);
    expect(await status.json()).toEqual({ oneTime: false, requireAuth: false });

    const read = await call(`/secret/${id}`);
    expect(read.status).toBe(200);
    expect(read.headers.get('Cache-Control')).toBe('private, no-cache');
    expect(await read.json()).toEqual({ expiration: 3600, message: PGP });

    expect((await call(`/secret/${id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await call(`/secret/${id}`)).status).toBe(404);
    expect((await call(`/secret/${id}`, { method: 'DELETE' })).status).toBe(404);
  });

  it.each([
    ['POST', '/request'],
    ['GET', '/auth/login'],
    ['POST', '/create/file'],
    ['GET', '/file/12345678-1234-1234-1234-123456789012'],
  ])('%s %s is not registered', async (method, path) => {
    expect((await call(path, { method })).status).toBe(404);
  });

  it.each(['/health', '/ready', '/version', '/config'])('GET %s', async path => {
    expect((await call(path)).status).toBe(200);
  });

  it('serves the rebranded frontend for /', async () => {
    const res = await call('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('EnterPass');
  });

  it('returns the unlicensed /config key set without MAX_FILE_SIZE', async () => {
    const config = (await (await call('/config')).json()) as Record<string, unknown>;
    expect(Object.keys(config).sort()).toEqual([
      'ALLOW_CUSTOM_EXPIRATION',
      'ARGON2',
      'DEFAULT_EXPIRY',
      'DEFAULT_ONETIME_SECRETS',
      'DEFAULT_READ_RECEIPT',
      'DISABLE_FEATURES',
      'DISABLE_ONE_CLICK_LINK',
      'DISABLE_UPLOAD',
      'FORCE_ONETIME_SECRETS',
      'MAX_EXPIRATION',
      'MIN_EXPIRATION',
      'NO_LANGUAGE_SWITCHER',
      'NO_THEME_SWITCHER',
      'OIDC_ENABLED',
      'PREFETCH_SECRET',
      'READ_ONLY',
      'READ_RECEIPTS',
      'REQUIRE_AUTH',
      'SECRET_REQUESTS',
      'THEME_DARK',
      'THEME_LIGHT',
    ]);
    expect(config.DISABLE_UPLOAD).toBe(true);
  });

  it('sets the security and CORS headers on API responses', async () => {
    const res = await call('/config');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Content-Security-Policy')).toContain(
      "frame-ancestors 'none'",
    );
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000');
  });

  it('answers the create preflight', async () => {
    const res = await call('/create/secret', { method: 'OPTIONS' });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
  });

  it('rejects unsupported methods', async () => {
    expect((await call('/create/secret')).status).toBe(405);
  });
});

describe('create secret policy errors (TestCreateSecretPolicyErrorContract)', () => {
  const valid = { message: PGP, expiration: 3600, one_time: true };
  it.each([
    ['invalid json', '{not json', 'Unable to parse json'],
    ['wrong field type', { ...valid, one_time: 'yes' }, 'Unable to parse json'],
    ['message not PGP encrypted', { ...valid, message: 'plaintext' }, 'Message must be PGP encrypted'],
    ['invalid expiration', { ...valid, expiration: 123 }, 'Invalid expiration specified'],
    ['require_auth without OIDC', { ...valid, require_auth: true }, 'Authentication not configured on this server'],
    ['receipt requested but not enabled', { ...valid, receipt: true }, 'Read receipts are not enabled on this server'],
    ['message too long', { ...valid, message: PGP + ' '.repeat(10000) }, 'The encrypted message is too long'],
  ])('%s', async (_name, body, message) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message });
  });

  it('rejects an oversized body with 413', async () => {
    const res = await post({ ...valid, message: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });
});

describe('one-time and expiry guarantees', () => {
  it('returns a one-time secret exactly once', async () => {
    const id = await create();
    const first = await call(`/secret/${id}`);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ expiration: 3600, message: PGP, one_time: true });
    expect((await call(`/secret/${id}`)).status).toBe(404);
    expect((await call(`/secret/${id}/status`)).status).toBe(404);
  });

  it('gives a one-time secret to only one of many concurrent readers', async () => {
    const id = await create();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => call(`/secret/${id}`)),
    );
    const statuses = results.map(r => r.status).sort();
    expect(statuses.filter(s => s === 200)).toHaveLength(1);
    expect(statuses.filter(s => s === 404)).toHaveLength(9);
  });

  it('deletes the secret when its alarm fires', async () => {
    const id = await create({ one_time: false });
    const stub = env.SECRETS.get(env.SECRETS.idFromName(id));
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    expect((await call(`/secret/${id}`)).status).toBe(404);
  });

  it('treats a secret past its deadline as gone even before the alarm runs', async () => {
    const id = await create({ one_time: false });
    const stub = env.SECRETS.get(env.SECRETS.idFromName(id));
    await runInDurableObject(stub, (_instance: SecretStore, state) => {
      const secret = state.storage.kv.get<StoredSecret>('secret')!;
      state.storage.kv.put('secret', { ...secret, expires_at: Date.now() - 1 });
    });
    expect((await call(`/secret/${id}`)).status).toBe(404);
  });

  it.each([86400, 604800])('accepts expiration %i', async expiration => {
    await create({ expiration });
  });
});

describe('isPGPEncrypted (pkg/server/validation.go)', () => {
  it('accepts armored messages with and without headers or checksum', () => {
    expect(isPGPEncrypted(PGP)).toBe(true);
    const bare = PGP.replace(/Version: .*\nComment: .*\n/, '').replace(/\n=0vwU/, '');
    expect(isPGPEncrypted(bare)).toBe(true);
    expect(isPGPEncrypted(PGP.replace(/\n/g, '\r\n'))).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['plaintext', 'hello'],
    ['wrong block type', PGP.replace(/PGP MESSAGE/g, 'PGP SIGNATURE')],
    ['bad checksum', PGP.replace('=0vwU', '=AAAA')],
    ['empty body', '-----BEGIN PGP MESSAGE-----\n\n-----END PGP MESSAGE-----'],
    ['trailing content', PGP + '\nmore'],
  ])('rejects %s', (_name, content) => {
    expect(isPGPEncrypted(content)).toBe(false);
  });
});
