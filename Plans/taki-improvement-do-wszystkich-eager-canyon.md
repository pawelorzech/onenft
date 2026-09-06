# Yours page, downloads, and the way back to the hub

## Context

Paweł wants to open any collection site (knot, blit, chainrun, soon faces) and see the tokens his wallet holds there, then save any of them as SVG, PNG or JPEG in one click. He also wants the same view on onenft.click for every collection at once, and an obvious way back from a collection site to the hub.

What exists today (verified in code): every collection site already has a holder page at `/0x…` and `/name.eth` (`holderPage` in `src/pages.ts`) and JSON at `/api/holder/<who>` (`holderJson` in `src/api.ts`), both filtering the `owners` map built by `ownersUpTo` in `src/contract.ts`. Nothing lets a visitor get there from the site itself: no connect button, no address field, no nav link. Downloads are SVG only, via the `download` attribute. PNG is a 1200 by 630 share card, not the artwork. The hub (`~/Programowanie/onenft-hub`) reads only `/api/today` and `/api/days` and has no wallet view. Contracts are plain ERC721, not Enumerable, so the `ownerOf` multicall sweep stays the source of ownership.

Decisions taken with Paweł on 2026-09-05:

- Yours page in every collection and a `/wallet` page on the hub.
- Identity: "Connect wallet" button (`eth_requestAccounts`) plus an address or `.eth` field; last address remembered in `localStorage`.
- Downloads: the artwork alone, square, sizes 1024 / 2048 / 4096. SVG from the server; PNG and JPEG rendered in the browser with canvas. No new server dependency.
- Layout A from the design canvas: one row per token (256px art, day number in Syne, traits, claim line) with its own download bar. Hub does downloads too, not only links.
- Back link: breadcrumb `onenft.click / knot.onenft.click` in the top bar of every inner page, plus a line in the home footer.
- Four collections in total. Faces is being built now by another agent and may change its token model later. The hub must depend only on the HTTP contract below, never on one-token-per-day.
- Hub order: Faces at the top, then Knot, Blit, Chain Run (home page and wallet page alike).

Design canvas (view only, served locally while this session runs): `http://localhost:3999`, source in the session scratchpad `design/` folder (`Main.dc.html` is layout A, `Hub.dc.html` is the hub page).

## The contract every collection site keeps (for the hub and for Faces)

- `GET /api/holder/<0x… | name.eth>` returns `{ address, name, author, days: [ { day, date, traits, image, url, claim, opensea, ... } ] }` exactly as `holderJson` does today. `.eth` is resolved by the collection site (`resolveHolder` in `src/ens.ts`), so the hub needs no chain or ENS code. `days` is a list of tokens; `day` is the token id shown as the label.
- `GET /day/N.svg` serves the artwork with `access-control-allow-origin: *` (already true in `svg()` in `src/server.ts`). The hub fetches it cross-origin for downloads.
- `GET /yours` is the entry page (connect or type), and `/<who>` the result page.
- The Faces agent gets this section verbatim. If Faces later has several tokens per day, it still fits: more entries in `days`.

## Part 1: collection sites (knot first, then copy to blit and chainrun)

All paths relative to `~/Programowanie/onenft`. Blit and chainrun are byte-for-byte the same layout; apply the same diff with the generator name swapped (`blitFor`, `runnerFor`) and `PIXEL = true` for both.

### 1a. Top bar and footer (`src/site.ts`)

- `topBar()` (line 234): render `<a class="mark syne" href="https://onenft.click">onenft.click</a><span class="sep">/</span><a class="mark syne" href="/">knot.onenft.click</a>` using the existing `PARENT` and `SITE` constants; hub part in `--muted`, separator in `--line`. Append `<a href="/yours">Yours</a>` to the nav.
- Home page sidebar (`homePage`, nav at line 343 and footer at line 360): add `Yours` to the nav, and `Part of onenft.click` with a link in the footer. The home `mark` also becomes the breadcrumb.
- CSS in `css()`: `.crumb` styles (flex, gap 10px, baseline), `.crumb .hub{color:var(--muted);font-weight:700}`, `.crumb .sep{color:var(--line)}`.
- Update `site.test.ts` expectations for the top bar.

### 1b. Entry page `/yours` (`src/pages.ts`, `src/server.ts`)

- New `yoursPage(today, chain)`: `topBar()`, heading "Your days", one line of copy, then the `.who` block: `<button class="cta" id="connect">Connect wallet</button>`, `<form action="/go" method="get"><input name="who" placeholder="0x… or name.eth"><button class="cta ghost">Show</button></form>`. When `chain` is null show "The chain did not answer" and hide the button.
- Server: `/yours` renders the page. `/go?who=…` validates (`/^0x[0-9a-fA-F]{40}$/` or `/\.eth$/`) and 302s to `/<who>`; anything else 302s back to `/yours`. This keeps the form working without JS.
- Inline script `CONNECT` (new constant next to `YOURS` at `src/site.ts:211`, same raw EIP-1193 style as `mintScript`): on click `eth_requestAccounts`, take `accs[0]`, store in `localStorage.onenft_who`, `location.href = '/' + acc`. If `window.ethereum` is missing, disable the button with text "No wallet in this browser" and focus the field. On load, if `localStorage.onenft_who` exists, show "Last time: 0x84Cf…76Df, open" as a link under the form. Errors go to `#msg` (`aria-live="polite"`), code 4001 → "Cancelled in the wallet."

### 1c. Holder page as layout A (`src/pages.ts:149`)

- Keep the signature and the `mine` filter (sort descending stays). Replace the `.strip` with one `.tok` block per day:
  - left: `<img src="/day/N.svg" width="256" height="256" alt="Day N" loading="lazy">`
  - right: `<div class="num syne">Day N<span class="yours">yours since {date}</span></div>` (date from `dateOf(d.epoch)` in `src/chain.ts`; when `chain.claims.get(n)` exists add `afterMidnight(claim.at, d.startsAt)` from `src/site.ts:239`), `traitList(k)` (`src/site.ts:216`, all ten traits fit next to a 256px image), a small line with Transaction (`claim.tx` via `explorer(chain.chainId)`), OpenSea (`opensea(chain, n)`), day page.
  - download bar `.dl`: `<a class="btn" href="/day/N.svg" download="knot-day-N.svg">SVG</a>`, `<a class="btn" href="/day/N.png" data-dl="png" data-day="N">PNG</a>`, `<a class="btn" href="/day/N.png" data-dl="jpeg" data-day="N">JPEG</a>`. Without JS the PNG and JPEG links fall back to the existing card; with JS the script below takes over.
  - one size selector per page, above the list: three `<button class="size" data-size="1024|2048|4096">` in a `.sizes` group, default 2048, choice kept in `localStorage.onenft_size`.
- Header block: `label(who, names)` as now, "N days of M", the `.who` block from 1b under it so a visitor can switch wallets from here.
- Footer nav: Basescan, OpenSea, JSON, and "All your days on onenft.click" → `https://onenft.click/wallet/<who>`.
- Empty state stays: "No days here yet. Today's knot may still be free."
- CSS: `.tok`, `.tok img`, `.tok .meta`, `.dl`, `.btn`, `.sizes` (values lifted from `Main.dc.html`; 1px hairlines, no radius, Syne on buttons). At `max-width:900px` the `.tok` grid goes to one column with the image at 100%.
- Update `pages.test.ts:50` (holder lists that wallet's days only) for the new markup and add a test that a page with claims shows the download bar three times per day.

### 1d. Browser rasterizer script (`src/site.ts`, new constant `DOWNLOAD`)

Injected on the holder page. Plain script, no bundler, same style as `mintScript`:

1. Read size from the selector (default 2048). Clicking a `.size` button updates the group and `localStorage`.
2. On click of `[data-dl]`: `preventDefault`; `fetch('/day/N.svg')` → text; `stripSize` equivalent inline (remove `width`/`height` from the root so the image scales) → `Blob` of type `image/svg+xml` → `Image` with `width = height = size` → `canvas` of `size × size`; `ctx.imageSmoothingEnabled = PIXEL ? false : true`; for JPEG fill the canvas with the day's `palette.bg` first (no alpha in JPEG); `drawImage(img, 0, 0, size, size)`; `canvas.toBlob(cb, 'image/png' | 'image/jpeg', 0.92)`; create `<a download="knot-day-N-2048.png">` on an object URL, click, revoke.
3. Browsers rasterize an SVG image at the drawn size, so 32 by 32 pixel art in blit comes out crisp at 4096 without any extra work; `shape-rendering="crispEdges"` in the source SVG is honored. Verify this in Chrome on the blit site before shipping blit.
4. While rendering, the button text becomes "…" and returns after the save; a failure writes to `#msg`.
5. `PIXEL` is a module constant in `src/site.ts` (`false` in knot, `true` in blit and chainrun) and is serialized into the script's config.

### 1e. Docs

- `docs/DECISIONS.md`: one entry for the Yours page, the browser-side raster, the breadcrumb.
- `docs/ROADMAP.md`: move "connect wallet" out of open items; `docs/ARCHITECTURE.md` mentions `/yours`, `/go`, and that PNG/JPEG downloads are client-side while `/day/N.png` stays the share card.
- `README` route list if it has one.

### 1f. Copy to blit and chainrun

Same diff in `~/Programowanie/onenft-blit` and `~/Programowanie/onenft-chainrun`: `topBar`, `homePage` nav and footer, `yoursPage`, `holderPage`, `/yours` and `/go` routes, `CONNECT` and `DOWNLOAD` scripts, CSS, tests, docs. Swap `knotFor` for `blitFor` / `runnerFor`, the download filename prefix (`blit-day-N`, `chainrun-day-N`), and set `PIXEL = true`. Blit and chainrun trait lists differ; use each repo's own trait helper.

## Part 2: the hub (`~/Programowanie/onenft-hub`)

### 2a. Routes (`src/server.ts`)

- `OWN` is an exact-match set; add `/wallet` and `/go`, and let `handle` match `/wallet/<who>` by prefix before the redirect fallback. `/go?who=…` validates like 1b and 302s to `/wallet/<who>`.
- `/wallet` renders the entry page (sidebar with Connect wallet + field, main area with one line per collection: name and "Open on host"). `/wallet/<who>` renders the results page.
- `/api/wallet/<who>.json` returns the merged data (per collection: `slug`, `name`, `host`, `ok`, `days`), so the page and other people's code read the same thing.

### 2b. Data (`src/state.ts`)

- `walletStates(who)`: `Promise.all` over `COLLECTIONS`, each `fetch(`https://${c.host}/api/holder/${who}`)` with the existing 6 s `AbortController` pattern; a failure yields `{ c, ok: false, days: [] }` and the page says "The site did not answer" for that collection. Take `address` and `name` from the first successful answer (the collection resolved the `.eth`).
- Cache: `Map<lowercased who, {at, states}>` with the existing 60 s TTL, capped at 200 entries (drop oldest) so a bot cannot grow it.
- Do not assume one token per day; render whatever `days` holds.

### 2c. Page (`src/site.ts`)

- Same shell as `homePage`: sidebar with `mark`, `h1` = wallet name, lead, total count and per-collection counts ("7 days: 4 knots, 2 blits, 1 runner"), the `.who` block (Connect wallet, field, Show), size selector, nav to each section. Main: one `.coll` section per collection with `h2` name + "N of M days" and "Open on host", then a `.strip` of 160px tiles (`img.pixel` when `c.pixel`), caption "day N, palette" where the collection's traits have a palette, and three chips SVG / PNG / JPEG.
- Order of collections on the hub (Paweł, 2026-09-05): **Faces first**, then Knot, Blit, Chain Run. `COLLECTIONS` in `src/collections.ts` is the single source of order for the home page, the wallet page, the JSON and the footer, so the Faces entry goes at index 0 when it lands; knot, blit, chainrun keep their relative order. `PALETTE_SOURCE` stays `knot` (the palette rule does not follow the order). Until Faces is live there is no placeholder in production (the canvas placeholder is for the mockup only).
- Home page: add "Your wallet" to the sidebar nav and footer.
- CSS lifted from `Hub.dc.html`.

### 2d. Downloads on the hub

- Same `DOWNLOAD` script as 1d, with two differences: the SVG chip also goes through `fetch` + blob (browsers ignore `download` on cross-origin hrefs), and `PIXEL` comes per tile from `data-pixel`. Cross-origin `fetch` of `/day/N.svg` works because `svg()` sets `access-control-allow-origin: *`; `Image` from a same-origin blob URL keeps the canvas untainted.
- Filenames: `<slug>-day-N.svg`, `<slug>-day-N-<size>.png`.

### 2e. Tests and docs

- `site.test.ts`: wallet page lists tokens per collection, shows "did not answer" for a failed one, home has the wallet link. `server` test for `/wallet/<who>` prefix and `/go` validation.
- `README` / `CLAUDE.md` route list; `collections.ts` comment noting the holder contract above.

## Order of work

1. knot: 1a → 1b → 1c → 1d → tests → docs → push → Coolify redeploy (uuid in `CLAUDE.local.md`) → check on `https://knot.onenft.click/0x84Cf6667FdE676a5950730720b67d62B9AB476Df` (holds day 1).
2. blit, then chainrun: 1f, verify pixel crispness on blit at 4096.
3. hub: 2a → 2e → push → redeploy → `https://onenft.click/wallet/pawelorzech.eth`.
4. Hand the contract section to the Faces agent.

## Verification

- `bun test` green in all four repos (knot 46 tests today plus the new ones; hub 4 plus new).
- Local run: `PORT=3000 CONTRACT_ADDRESS=<mainnet> CHAIN_ID=8453 BASE_RPC_URL=https://mainnet.base.org bun run src/server.ts` (no `DEPLOYER_KEY`, so no autoclaim) and open `/yours`, `/0x84Cf…76Df`, `/go?who=pawelorzech.eth`, `/go?who=junk`.
- Claude in Chrome on the local site and then on production: Connect wallet prompts and lands on the holder page; PNG at 2048 saves a 2048 by 2048 file; JPEG has the palette background; SVG download still works; blit PNG at 4096 shows hard pixel edges; breadcrumb hub link goes to onenft.click; console shows no errors.
- Hub locally (`PORT=3001 bun run src/server.ts`, it reads the production collection APIs): `/wallet/pawelorzech.eth` shows knot day 1, empty sections for collections with no days, and the downloads save files; `/wallet/0xnonsense` bounces to `/wallet`.
- `test.onenft.click` and OpenSea checks by `curl`, since the Chrome extension has no permission there.
- Umami: the new pages inherit analytics on prod and none on test, as today.

## Out of scope

- WalletConnect and mobile wallets without an injected provider (typing the address covers them).
- ERC721Enumerable or any contract change.
- Changing `/day/N.png` (the share card stays for link previews).
