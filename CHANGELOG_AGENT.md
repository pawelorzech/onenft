# Changes made by the audit, 2026-09-05

Branch `feature/audit-fixes`, off `master` at `887d5fa`. Every change below has a test or a recorded reproduction. Nothing in `src/knot.ts`, `src/knot_v2.ts` or `contracts/` was touched, so on-chain output and the byte-equality fixtures are unchanged.

## Files changed

| File | What changed |
|---|---|
| `src/server.ts` | Boot no longer dies when the first chain read fails (try/catch around `chainState()` at startup). `today` and the countdown come from the clock, not from a cached chain read. Every response carries `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and, except `/embed`, `X-Frame-Options: SAMEORIGIN`. `/api/day/N` for a day that does not exist answers 404, not 200. Holder pages and `/api/holder/…` answer 503 with a "chain did not answer" page when a contract is configured but unreachable, instead of "No such day" 404. The home page gets an `offline` flag. Routing moved into `route(url)` so headers are applied in one place. |
| `src/ens.ts` | `safeName()`: a reverse ENS record is accepted only if it matches `[a-z0-9-]` labels ending in `.eth` and equals its ENSIP-15 normal form; anything else falls back to the address. Both caches are capped at 5000 entries. |
| `src/site.ts` | `<title>` and `og:title` are HTML-escaped. `--muted` is computed per palette by `mutedFor()` so it reads at 4.5:1 or better on every background (was a fixed 38% pull, 2.89:1 on `rust`). `homePage(...)` takes `offline` and always counts down from the clock. New `chainDown()` page. New helpers `contrast()`, `mutedFor()`, `MUTED_MIN_CONTRAST`. |
| `src/contract.ts` | `client` exported; `readChainState()` guards the null client (type error before). |
| `src/autoclaim.ts` | After sending a claim the tick waits for the receipt (120 s timeout) before releasing `busy`, so a slow network cannot get a second claim for the same day. |
| `src/autoclaim.test.ts`, `src/knot.test.ts` | Type fixes only (fake state was missing `renderer` and `claims`; a `Set` type was too narrow). |
| `src/ens.test.ts` | New. |
| `src/site.test.ts` | Four new tests (below). |
| `tsconfig.json` | New. `bun run typecheck` = `tsc -p tsconfig.json`, strict, over `src/` and `contracts/fixtures.ts`. |
| `package.json`, `bun.lock` | `typescript` and `@types/bun` as devDependencies; `typecheck` script. |
| `.github/workflows/ci.yml` | `bun run typecheck` before `bun test` in the site job. |
| `scripts/status.sh` | Mainnet `SITE` is `https://knot.onenft.click` (was the root, which is the hub since the move). |

## Tests added

- `ens.test.ts`: plain names pass; names with `<`, `"`, `&`, space, `/`, uppercase, emoji, underscore, no `.eth`, empty, null, over 255 chars are dropped.
- `site.test.ts`: muted text contrast ≥ 4.5 on all 16 palettes and still below the full fg contrast; countdown uses the clock even when the chain state says 7 s left; `offline` copy replaces "Claiming on-chain opens today" and `chainDown()` renders; a hostile name in the names map cannot escape `<title>` or the heading.

## Behaviour changes a reader of the site may notice

- Muted text (labels, the lead paragraphs, "taken by …") is a little brighter on the low-contrast palettes: `rust`, `salt`, `bone`, `fog`, `wine`, `copper`, `ash`. Unchanged on the other nine.
- When the RPC is down: the home page says "The chain did not answer. Try again in a minute." under the download button; wallet pages answer 503 with that sentence instead of "No such day".
- `/api/day/N` for a future or nonexistent day is now a 404 (body unchanged).
- Pages other than `/embed` refuse to load inside an iframe on another origin.

## Potential regressions to watch

- `X-Frame-Options: SAMEORIGIN` on everything except `/embed`. If some page other than `/embed` was ever meant to be framed elsewhere, it now shows blank there.
- The day shown is the server clock's day. Before, when a chain read succeeded, it was the contract's `currentDay()`. They agree unless the container clock is wrong.
- `safeName()` drops emoji and underscore names. Those wallets now show as `0x1234…abcd` instead of their name. The site's own holder route never accepted such names, so the link would have 404'd anyway.
- The autoclaim tick can now stay busy for up to 120 s after a send. The interval is 5 min, so no tick is skipped in practice.

## Manual QA before merge

1. Production redeploy, then `curl -sI https://knot.onenft.click/ | grep -i x-frame` shows `SAMEORIGIN`, and `/embed` does not.
2. Put `/embed` in an iframe on a page from another origin: it must render. Put `/` in one: it must not.
3. Open the home page in Chrome on a `rust` day (next: check `/explore` preview captions) and read the muted text.
4. Container logs after a deploy show `contract 0x… on chain 8453` and `autoclaim armed`.
