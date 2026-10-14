# EnterPass on Cloudflare Workers

The Yopass secret API re-implemented as a Cloudflare Worker, serving the rebranded frontend in
`../website`. Runs on the Workers **Free** plan; no Go server, no memcached/Redis.

**Scope:** secret sharing and the password generator. File uploads, OIDC, secret requests and
read receipts are off (the latter three need a Yopass business licence anyway).

## How it works

| Piece                                                                                                                   | Where                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Frontend (React, OpenPGP.js)                                                                                            | Static assets from `../website/dist`; headers from `_headers`               |
| `POST /create/secret`, `GET/DELETE /secret/{id}`, `GET /secret/{id}/status`, `/config`, `/health`, `/ready`, `/version` | `src/index.ts` (same wire contract as `pkg/server`, see `test/api.test.ts`) |
| Storage                                                                                                                 | One SQLite-backed Durable Object per secret (`src/secret-store.ts`)         |

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

## Before every deploy

Run all of it; deploy only when every line passes.

```sh
# website
cd ../website
NODE_OPTIONS=--no-experimental-webstorage npx vitest run   # 145 unit tests
npx eslint . && npx prettier --check src tests && node scripts/check-locales.mjs
cd ../worker
npm run build:site            # tsc + vite build, copies _headers
npx tsc --noEmit && npm test  # Worker types + 35 runtime tests
npx wrangler dev              # in another terminal
npm run e2e                   # browser gate against http://127.0.0.1:8787
npm run deploy
npm run e2e -- https://pass.entermind.my   # same gate on the live site
```

`npm run e2e` (needs Microsoft Edge, or `E2E_CHANNEL=chrome`) runs four checks in `e2e/`:
`flow` (create, reveal once, second open gone, generator, branding, no page errors), `mobile`
(every screen at 360/390/768: no sideways scroll, nothing off-screen, no text under 13px),
`footer` (each footer link visibly takes you somewhere) and `clicks` (every link and button on
every page has a visible effect). Screenshots land in `e2e/.shots/` (gitignored).

vitest is pinned to 4.1: `@cloudflare/vitest-plugin` fails on Windows with vitest 5 ("File path
must be a file: URL").

## Keeping up with upstream

`worker/` is new and never conflicts. After rebasing the rebrand on a new upstream release, rerun
`npm test`. If upstream changes the secret routes, `/config` keys or error messages
(`pkg/server/contract_test.go`), mirror the change here.

## Live

- **https://pass.entermind.my**: Workers custom domain, attached 14 Oct 2026 (declared in
  `wrangler.jsonc` `routes`). It replaced a proxied CNAME to the `deck-entermind` tunnel
  (`5f707938-34cb-4a20-bf7b-7837824d6bbc.cfargotunnel.com`), which was returning 502. To roll back:
  remove the route, delete the custom domain, recreate that CNAME.
- Preview: https://entermind-pass.jeremy-lee-606.workers.dev
- The zone injects Cloudflare Web Analytics' beacon into pages; the CSP blocks it, so nothing is
  collected but the browser logs one CSP error. Turn Web Analytics off for this hostname to stop it.
