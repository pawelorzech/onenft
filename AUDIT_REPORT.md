# Audit report, knot.onenft.click

Audit date: 2026-09-05. Repo at `887d5fa` on `master`; fixes on `feature/audit-fixes`. Facts only; recommendations are in `UX_RECOMMENDATIONS.md`, the diff is described in `CHANGELOG_AGENT.md`.

Confirmation statuses used below: **confirmed** (reproduced with a tool or a test), **highly probable** (read from code, mechanism verified, not reproduced end to end), **hypothesis**, **observation** (qualitative).

## 1. What the project is

- A Bun + TypeScript website (`src/`, 2,300 lines) and two Solidity contracts on Base mainnet (`contracts/`, OpenZeppelin 5.x, Foundry). One ERC-721 token per UTC day, claimable free for gas; image rendered on-chain by a swappable renderer contract from the day number alone. TypeScript is the source of truth for the image; a Foundry test enforces byte equality against fixtures generated from TS.
- Users: collectors with an injected wallet (claim, "yours" page), anyone browsing (calendar, traits, downloads, RSS, JSON API), other developers (`/spec.json`, CC0).
- Data: nothing is stored server-side. All state is on chain; the server keeps in-memory caches (chain state 12 s, past owners 10 min, ENS 6 h, PNG cards of past days, the `Claimed` log scan). Browser `localStorage` holds the last wallet address and the download size.
- Integrations: Base RPC (`BASE_RPC_URL`), Ethereum L1 RPC for ENS (`ETH_RPC_URL`, default publicnode), Google Fonts, Umami analytics (prod only), OpenSea/Basescan links. Deploys via Coolify from `master`; CI on GitHub Actions runs `bun test` and `forge test`.
- Auth, sessions, payments, user accounts: none. The only write path is the visitor's own wallet sending `claim()` and the container's autoclaim from the deployer key.
- Highest-risk areas: the immutable token contract (audited before deploy, see `docs/AUDIT.md`), the deployer key in the hosting env, the availability of a single public RPC, HTML built by string templates from chain-sourced strings.

## 2. Baseline before changes

| Command | Result |
|---|---|
| `bun install --frozen-lockfile` | ok, 27 packages |
| `bun test` | 51 pass, 0 fail, 5 files |
| `bun run contracts/fixtures.ts` | 12 v2 + 60 v4 fixtures written, identical to the committed ones |
| `cd contracts && forge test` (forge 1.8.1) | 19 pass, 0 fail (13 OneNFT, 3 KnotRenderer, 3 KnotRendererV4) |
| Type-check | **No gate existed** (no `tsconfig.json`, no `typescript`). Run ad hoc with strict tsc: 7 errors in `src/` (listed under P3-1). |
| Lint / format | None configured. |
| Dependency audit | 2 runtime deps (`viem` 2.56.3, `@resvg/resvg-js` 2.6.2). `bun.lock` frozen. Submodules: forge-std v1.16.2, openzeppelin-contracts at `cab19933` (a 5.x tree, tag not resolved by `git submodule status`). |
| Live site | `/health` → `ok, day 1, …, contract 0xb3b8…E783, claims scanned 1`. Home, `/explore`, `/pawelorzech.eth` opened in Chrome at 1440 px: no console messages, all requests 200 (fonts, Umami script and `/api/send`, day and preview SVGs). |
| Old links after the domain move | `https://onenft.click/{day/1, day/1.svg, feed.xml, how, api/today, calendar.ics, 0x…}` all 301 to `knot.onenft.click`. No regression found. On-chain metadata contains no URL (`grep onenft.click contracts/src` empty). |

Not runnable here: Chrome cannot resize below about 1200 px on this machine, so the sub-900 px layout was checked in CSS only. `test.onenft.click` and OpenSea are outside the extension's permissions (per `CLAUDE.local.md`).

## 3. Findings

### P1

**P1-1. Server crashes at boot when the RPC does not answer.** Confirmed. `src/server.ts:34` (before) awaited `chainState()` at top level; `chainState()` throws when there is no `lastGood` state yet (`src/contract.ts:102`). Reproduced: `BASE_RPC_URL=http://127.0.0.1:9 bun run src/server.ts` exits with `ContractFunctionExecutionError: HTTP request failed` before `Bun.serve`. In Docker that is a restart loop for as long as the RPC is down, and the autoclaim loop never arms. Fixed: try/catch at boot; the site starts as a plain renderer and the request path recovers on the next successful read. Verified: same command now serves `/health` → `ok, day 1`.

**P1-2. Reverse ENS names reach HTML unescaped (stored XSS through a wallet's reverse record).** Highly probable. `viem.getEnsName` returns the string from the universal resolver as is (`node_modules/viem/_esm/actions/ens/getEnsName.js:59`), and a subname owner can register a label with any bytes. That string is inserted raw in `src/site.ts` `dayPage` (`taken by <a href="/${label}">${label}</a>`), `homePage` rows, `embedPage`, and `layout()`'s `<title>` and `og:title`. `holderPage` escapes the heading but not the title. Not reproduced on chain (that would need a hostile ENS record). Fixed at the ingestion point: `safeName()` in `src/ens.ts` accepts only `[a-z0-9-]` labels in ENSIP-15 normal form; `<title>`/`og:title` are escaped as defence in depth. Tests: `ens.test.ts`, `site.test.ts` "hostile name".

### P2

**P2-1. `--muted` text fails WCAG AA on 9 of 16 palettes.** Confirmed by computation (`src/site.ts:57`, fixed 38% pull toward the background). Ratios before: rust 2.89, salt 3.29, bone 3.32, fog 3.56, wine 3.83, copper 3.88, ash 4.09, brick 4.65, tar 4.87; the other seven above 5. `--muted` is used for 15 px `.small`, `.lead`, table headers, trait labels. Fixed: `mutedFor()` picks the pull per palette so every palette reads ≥ 4.5:1. Test in `site.test.ts`.

**P2-2. Countdown and "today" came from a cached or stale chain read.** Highly probable. `homePage` used `chain.secondsLeft` (up to 12 s stale by design, hours stale when `lastGood` is being served during an outage); the countdown script reloads the page when it reaches zero, and a stale value would reload again on every visit. `today` was `chain.day`, so during an outage the site would show yesterday as today. Fixed: both from the server clock (`dayOfTime(now)`, `secondsLeft(now)`), which is the same arithmetic the contract runs on `block.timestamp`. Test: "the countdown comes from the clock".

**P2-3. When a contract is configured but unreachable, the home page said "Claiming on-chain opens today"** and holder pages answered "No such day" (404). Confirmed with the dead-RPC run. The first is the pre-launch sentence, wrong on day 1+. Fixed: `offline` flag → "The chain did not answer. Try again in a minute."; holder pages and `/api/holder` answer 503 with the same sentence.

**P2-4. No security headers.** Confirmed: `curl -I https://knot.onenft.click/` shows only `cache-control`, `content-type`, `alt-svc`. No `X-Content-Type-Options`, no `Referrer-Policy`, no frame protection, no CSP. Fixed: nosniff, referrer-policy, `X-Frame-Options: SAMEORIGIN` on everything except `/embed`. CSP not added: every page uses inline scripts and styles, so a CSP would need `'unsafe-inline'` or nonces; left as a recommendation.

**P2-5. Autoclaim could send a second `claim()` for the same day.** Hypothesis, low likelihood. The tick runs every 5 min and reads a 12 s cache; if the first transaction is still pending at the next tick, `owners` lacks the day and a second transaction goes out, which reverts with `DayAlreadyClaimed` and wastes gas. Fixed: the tick waits for the receipt (120 s cap) before releasing `busy`.

### P3

**P3-1. No type-check gate; 7 strict-mode errors.** Confirmed with tsc 5.9. `src/autoclaim.test.ts:5` fake state missing `renderer`, `claims`; `src/contract.ts:111` `client` possibly null; `src/contract.ts:124` `""` not assignable to `Address`; `src/knot.test.ts:47,59` `Set<string|number>` too narrow for `boolean` traits; `src/server.ts:25` `Uint8Array<ArrayBufferLike>` as Response body. None crashed at runtime (Bun does not type-check). Fixed all; added `tsconfig.json`, `bun run typecheck`, CI step. `design/` and `design2/` are excluded: they call an older `renderKnot(epoch, n)` signature and are archived design rounds.

**P3-2. ENS caches grow without bound.** Confirmed by reading `src/ens.ts:11-12`: the forward cache is keyed by whatever `.eth` name a visitor requests, and each miss costs one L1 RPC call to a public node. Fixed: both maps clear at 5,000 entries. Rate limiting was not added (no evidence of abuse; see recommendations).

**P3-3. `/api/day/N` for a nonexistent day returned HTTP 200 with `{error}`.** Confirmed live (`/api/day/999999` → 200). Fixed: 404.

**P3-4. `scripts/status.sh` pointed mainnet `SITE` at `https://onenft.click`,** which is the hub since the move; its `/health` is another app's. Confirmed by reading. Fixed.

**P3-5. Copy on `/yours` says "Nothing is sent anywhere."** Observation. The chosen address becomes the page URL, which reaches the server log and Umami as a page path. Wallet addresses are public pseudonyms, but the sentence is stronger than the facts. Not changed (copy is the author's voice); see UX recommendations.

**P3-6. Download file names differ by page.** Observation. Home and day page: `onenft-day-N.svg`; holder page: `knot-day-N.svg` (`FILE_PREFIX`). Not changed.

**P3-7. Form field border is `--line` at about 1.35:1.** Observation. WCAG 1.4.11 asks 3:1 for input boundaries. The field also has a placeholder in `--muted`, so it is findable. Not changed.

**P3-8. `traitsPage` and `daysJson` render every day so far on each request.** Measured: `knotFor` ×1000 = 21 ms, so this is fine for years. Noted for the roadmap, not changed.

**P3-9. Docker runs as root.** Confirmed from `Dockerfile` (no `USER`). Not changed.

**P3-10. `status.sh`, `wire.sh`, `deploy.sh` use `python3` for JSON.** Observation against the project's own "never Python" rule; they are operator scripts, not project code. Not changed.

### Checked and clean

- Input handling: `/go?who=…`, `/<name>.eth`, `/0x…` and `/day/N` are regex-validated before use; hostile values return 302 to `/yours` or 404 (curl-confirmed). `esc()` covers the embed snippets. JSON responses are `JSON.stringify` only. No SQL, no filesystem paths from input, no uploads.
- Secrets: none in the repo (`rg -i "key|secret|token"` over tracked files finds only env names and docs). `CLAUDE.local.md` is gitignored. The Chrome session had no wallet, so `eth_accounts` paths were exercised only as the "No wallet in this browser" branch.
- Privacy: Umami is cookieless and only on prod; the page stores the last wallet address in `localStorage` on the visitor's own machine. No PII is collected server-side; server logs are the hosting default.
- Contract: unchanged; `docs/AUDIT.md` covers it. `preview(day)` with `day = 0` returns `startEpoch - 1`, harmless.
- CI: green on master (site + contracts jobs). Fixtures are committed and regenerated identically.
- Caching headers: past-day SVG/PNG immutable for a year, today's 60 s/300 s, HTML `no-store`, JSON 30 s with CORS `*`. Consistent with "past days never change".

## 4. Validation after changes

| Check | Result |
|---|---|
| `bun run typecheck` | 0 errors |
| `bun test` | 58 pass, 0 fail (7 new) |
| `cd contracts && forge test` | 19 pass, 0 fail (rerun after changes; nothing under `contracts/` changed) |
| Dead-RPC boot (`BASE_RPC_URL=http://127.0.0.1:9`) | server starts, `/health` → `ok, day 1`, home page shows "The chain did not answer", `/pawelorzech.eth` → 503 |
| Live-RPC local run (`https://mainnet.base.org`, no deployer key) | `/health` shows the contract and 1 scanned claim; headers present on `/`, absent `X-Frame-Options` on `/embed`; `/api/day/999` → 404; `--muted:#8b90a7` on ultramarine |
| Chrome on the local run (`/` and `/pawelorzech.eth`) | no console messages; page renders; muted text visibly readable |
| Not verified here | production redeploy; the sub-900 px layout in a real browser; an actual hostile ENS record; the autoclaim wait on a real send |

## 5. Limits of this audit

- One browser session, desktop width only, no wallet extension installed.
- The contract was not re-audited; it is immutable and was audited before deploy.
- No load testing. The public RPC's rate limits were not probed.
- `design/` and `design2/` were treated as archives and not reviewed.
