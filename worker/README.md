# EnterPass on Cloudflare Workers

The Yopass secret API re-implemented as a Cloudflare Worker, serving the rebranded frontend in
`../website`. Runs on the Workers **Free** plan; no Go server, no memcached/Redis.

**Scope:** secret sharing and the password generator. File uploads, OIDC, secret requests and
read receipts are off (the latter three need a Yopass business licence anyway).

## How it works

| Piece | Where |
|---|---|
| Frontend (React, OpenPGP.js) | Static assets from `../website/dist`; headers from `_headers` |
| `POST /create/secret`, `GET/DELETE /secret/{id}`, `GET /secret/{id}/status`, `/config`, `/health`, `/ready`, `/version` | `src/index.ts` (same wire contract as `pkg/server`, see `test/api.test.ts`) |
| Storage | One SQLite-backed Durable Object per secret (`src/secret-store.ts`) |

- Encryption happens in the browser. The Worker stores only PGP ciphertext and rejects anything
  that isn't an armored PGP message.
- **One-time secrets are read exactly once.** A Durable Object processes one event at a time and
  the claim-and-delete is synchronous, so concurrent readers can't both get it (tested with 10
  parallel reads).
- **Expiry:** an alarm deletes the secret at its deadline. Reads also check the deadline in case
  the alarm is late. Lifetimes: 1h, 1d, 1w (as upstream without custom expiration).
- Workers Logs are off: request logs would contain secret IDs.

## Free plan fit

100k Worker requests/day and 100k Durable Object requests/day. One shared secret costs about 4
Worker requests (create, status, read, config); static assets don't invoke the Worker. Storage is
tiny (≤10 KB per secret, deleted on read or expiry).

## Commands

```sh
cd ../website && yarn install --frozen-lockfile && cd ../worker   # once
npm ci
npm run build:site   # builds ../website/dist and copies _headers into it
npm test             # 35 contract + guarantee tests in the Workers runtime
npm run typecheck
npx wrangler dev     # local, http://127.0.0.1:8787
npm run deploy       # needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment
```

vitest is pinned to 4.1: `@cloudflare/vitest-plugin` fails on Windows with vitest 5 ("File path
must be a file: URL").

## Keeping up with upstream

`worker/` is new and never conflicts. After rebasing the rebrand on a new upstream release, rerun
`npm test`. If upstream changes the secret routes, `/config` keys or error messages
(`pkg/server/contract_test.go`), mirror the change here.

## Going live on pass.entermind.my

Preview: `https://entermind-pass.jeremy-lee-606.workers.dev`. To move the real hostname:
1. The entermind.my zone must be **active** in the dedicated Cloudflare account.
2. Add a Workers custom domain `pass.entermind.my` (it replaces the current tunnel CNAME).
3. Secrets created on the old Go server don't migrate. They expire within a week at most, so
   keep the old server reachable until then or accept that older links stop working.
