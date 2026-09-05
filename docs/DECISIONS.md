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
