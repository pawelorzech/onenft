# Decisions

Dated log of the choices that shape the project. Each entry says what was decided, why, and what it rules out.

## 2026-09-04 — Base, fully on-chain, one a day
Chain: Base. Only the Ethereum family lets `tokenURI` return a `data:` URI that wallets and marketplaces render; TON and Solana were rejected (no on-chain rendering path), Ethereum L1 was rejected on deploy cost. Art: a Truchet knot on an 8×8 grid, two bits per cell. One token per day, free, gas only, no treasury, no auction. A missed day stays a gap forever; supply is a record of attendance. Every tenth day goes to the author, stated on day one, until day 1000. Lesson taken from OKPC: give people a reason to come back; the clock in the contract is that reason.

## 2026-09-05 — Name and domain: onenft.click
`onenftaday.com` was chosen first and replaced within the hour by `onenft.click` (shorter, and "click" carries the one action). An objection was recorded and overruled: the word "NFT" ties the project to a category the plan itself calls collapsed. The domain doubles as the wordmark. Token symbol `ONAD`.

## 2026-09-05 — Design: the fabric
Ten skinned variants of one layout were rejected in full ("not good enough"). A second round of five structurally different layouts followed; "One continuous fabric" won: a vertical fabric of day rows, today as its own block on top, gaps as hatched rows, a sticky sidebar. Site colors come from today's palette; no theme toggle. Typography Syne + Newsreader. Rejected on principle: cream + terracotta, black + acid green, ALL-CAPS eyebrows, middle-dot metadata, mono labels, arrows in buttons.

## 2026-09-05 — All copy in English, plain
Every visible string in English, written to plain-language rules: active voice, no adverbs, no em dashes, nothing a reader can misread. The old Polish routes redirect (301). Palette names translated (ink, copper, moss, ash, ultramarine, rust, salt, tar), in the contract too.

## 2026-09-05 — Renderer per token, token immutable
The token contract has no proxy and no upgrade path. The renderer is a separate contract; its address is stored per token at claim time, so `setRenderer` changes future days only and a claimed knot never changes. `lockRenderer` is one-way. Ownership cannot be renounced.

## 2026-09-05 — `_mint`, not `_safeMint`
On a Base Sepolia fork a normal test account carried EIP-7702 delegation code and `_safeMint` reverted on `onERC721Received`. The claimer calls `claim()` themselves, so the safe-transfer check protects nothing. Fixed before mainnet.

## 2026-09-05 — Clock is `block.timestamp / 86400`
The original plan used `block.number / 43200`. The audit flagged that Base has signalled shorter block times; a block-number day would shrink without notice and the contract cannot be changed. Switched to UTC calendar days. Day 1 = 20701 = 2026-09-05. The same epoch on every chain, so testnet and mainnet show the same images.

## 2026-09-05 — Mainnet now, not after 90 days
The original gate plan (public renderer → 90 days under the author's name → spec → testnet → mainnet on demand) was collapsed by the owner to "everything now". Mainnet went up after a cross-vendor audit returned GO. Testnet lives on its own subdomain because the site's images must not depend on which chain it reads.

## 2026-09-05 — Royalties stay at zero
No ERC-2981. A new contract with royalties was offered and declined ("leave it as is"). The author's cut is the author days.

## 2026-09-05 — Author line removed from the site
Footer and `/how` no longer name the author. Kept: "This is not an investment and never will be."

## 2026-09-05 — Renderer v3: seven traits, day 2 onward
The v2 generator had 8 × 4^64 combinations and eight looks: the same grid, the same cord, the same four shapes every day. Nouns and Gnars keep people coming back with nameable traits, so v3 draws seven from the day number: palette (16), grid (6, 8, 10, 12), weave (arcs, passes, loose, cross), symmetry (none, mirror, quad, turn), weight, caps, and a rare accent color. All of them go into the token metadata. The switch happens on day 1, so only day 1 keeps v2 (its renderer is stored on the token). Rejected: keeping 8 by 8 only, and palettes plus symmetry only. The site renders past days with the renderer they were claimed with (`knotFor`).

## 2026-09-05 — CC0, stated
Every knot, the generator, the contracts and the site are CC0. Stated on `/assets`, in the footer and in the token description. Nouns and Gnars showed that a public domain brand travels further than a licensed one; there is nothing here to protect.

## 2026-09-05 — Site pages after Nouns and Gnars
Added: day pages with the claim transaction and time after midnight, share links and an embed snippet; `/explore` (a calendar of every day, gaps hatched, the next seven days previewed); `/traits` (odds and counts); holder pages at `/0x…` and `/name.eth`; `/assets`; JSON at `/api/*` and `/spec.json`; `/embed`; `/calendar.ics`. Deferred: a Farcaster or Base mini-app (needs a developer account and a signed manifest). Not added: the live vote feed and treasury of a DAO; there is no treasury.

## 2026-09-05 — Renderer v4 replaces v3 the same day
v3 (seven traits) went on chain at 12:00 UTC and was judged not varied enough within the hour. v4 adds three traits: style (cord, double, dashed, solid Truchet triangles), ground (flat, dots, lattice) and an inverted palette one day in four. Masks (circle, diamond, frame) were prototyped and declined. v3 never minted a token, so it was replaced in place rather than frozen; its addresses stay in DEPLOYMENTS.md as superseded.

## 2026-09-05 — The knot moves to knot.onenft.click; the root becomes the hub
Three daily collections exist now (knot, blit, chainrun), and more are planned. The root `onenft.click` becomes a landing that lists every collection and redirects every old knot path (`/day/N`, `/explore`, `/api/*`, `/feed.xml`, holder pages) to `knot.onenft.click` with a 301. The on-chain renderer never embedded the host, so nothing on chain changes. The landing lives in its own repo (`onenft-hub`) and reads each collection's `/api/today` and `/api/days`; adding a collection is one entry in its table. The wordmark of the knot is now `knot.onenft.click`.

## 2026-09-05 — Yours page, downloads drawn in the browser, the way back to the hub
Every collection site gets `/yours`: a Connect wallet button (`eth_requestAccounts`, no wallet library) and a field for an address or ENS name that posts to `/go`, which redirects to the holder page. The holder page shows one row per day: the image, the day number, when it was claimed, the ten traits, and a download bar. SVG is the file the contract holds. PNG and JPEG are drawn in the browser on a canvas at 1024, 2048 or 4096 pixels from that SVG, so the server gains no dependency and `/day/N.png` stays the 1200 by 630 share card. The top bar of every page is a breadcrumb, `onenft.click / knot.onenft.click`, so the hub is one click away. The hub gets `/wallet/<who>`, which reads `/api/holder/<who>` from every collection; that JSON and `/day/N.svg` with an open CORS header are the contract each collection keeps. Rejected: a gallery with one big image and a rail (fine for three tokens, tiring for thirty), and keeping the thumbnail grid with a side panel (two steps to a download).
