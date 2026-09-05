# Architecture

Last verified: 2026-09-05

## One number in, one knot out
1. **Clock.** `day = block.timestamp / 86400` (UTC calendar day). The site computes the same number from `Date.now()`; when a contract is configured it trusts `currentDay()` from the chain instead.
2. **Seed.** The day number goes through splitmix64 (`mix` in both languages). A counter starts at `mix(day)`; each draw increments the counter, mixes it, and takes the top bits.
3. **Palette.** First draw, 8 bits, `mod 8` picks one of: ink, copper, moss, ash, ultramarine, rust, salt, tar (`PALETTES` in `src/knot.ts`, `palettes()` in `KnotRenderer.sol`).
4. **Cells.** 64 draws of 2 bits. State 0 and 1: two quarter-arcs in one of two orientations. State 2: vertical pass. State 3: horizontal pass.
5. **SVG.** One path string built cell by cell (cell 64 units, half 32), drawn twice: shadow (`stroke-width="21"`, palette `shade`) under cord (`stroke-width="9"`, palette `cord`), on a `rect` in palette `bg`. Integer stroke widths on purpose: Solidity cannot print `64/3`.
6. **Token URI.** `KnotRenderer.tokenURI(day, epoch)` returns `data:application/json;base64,…` with `name`, `description`, `image` (`data:image/svg+xml;base64,…`) and attributes Day, Epoch, Palette. About 8.5 kB, about 1.27M gas in `eth_call`.

`contracts/fixtures.ts` renders a set of epochs from TypeScript into `contracts/test/fixtures/knots.json`; `KnotRenderer.t.sol` asserts `keccak256(svg)` equality for each. Any drift between the two implementations fails the build.

## Contracts (`contracts/src`)
- `OneNFT.sol` — ERC-721 (OpenZeppelin 5.x) + Ownable. `claim()` mints `tokenId = currentDay()` to `msg.sender`, or to `author` on author days (day % 10 == 0, day ≤ 1000). No price. `rendererOf[tokenId]` is set at claim. `tokenURI` delegates to that renderer. `setRenderer` (owner, probes the new renderer), `lockRenderer` (owner, one-way), `renounceOwnership` reverts. Constructor rejects `startEpoch` outside `[today, today+7]`. Uses `_mint` (EIP-7702 accounts break `_safeMint`).
- `KnotRenderer.sol` — pure; `svg(epoch)`, `paletteName(epoch)`, `tokenURI(day, epoch)`, `cells(epoch)`.
- `IKnotRenderer.sol` — the interface the token calls.

## Site (`src`)
- `server.ts` — Bun.serve, routes, 301s for the old Polish paths, starts autoclaim when `DEPLOYER_KEY` is set.
- `site.ts` — all HTML/CSS/copy. `homePage` (the fabric), `dayPage`, `howPage`, `beforeStart`, `notFound`, `feedXml`. Colors are CSS variables derived from today's palette by `mix()`. The mint button is plain EIP-1193: `eth_requestAccounts`, `wallet_switchEthereumChain` (adds Base if missing), `eth_sendTransaction` with data `0x4e71d92d` (`claim()`), then polls the receipt. No wallet library in the browser.
- `contract.ts` — viem public client; one multicall for day/startEpoch/author/lock/secondsLeft, one multicall of `ownerOf` for days 1..today (`allowFailure: true`, a failure means a gap). 12 s cache.
- `chain.ts` — day math from unix seconds; `START_EPOCH` default 20701, overridden by the contract at boot.
- `autoclaim.ts` — every 5 min: if today is an author day and unclaimed, send `claim()` from the deployer.
- `image.ts` — 1200×630 PNG cards via resvg (fonts in `assets/fonts`), cached in memory for past days. Used for `og:image`, `/day/N.png`, RSS enclosures.
- `ens.ts` — reverse ENS on Ethereum L1 with a 6 h cache; failures fall back to `0x…`.
- `knot.ts` — the generator. Source of truth for the on-chain renderer.

## Caching and immutability
Past days never change: `/day/N.svg` and `/day/N.png` for `N < today` are served with a one-year immutable cache header. Today's files get 60–300 s. HTML is `no-store`.

## Design artifacts
`design/` (round one, ten skins, rejected) and `design2/` (round two, five structures; "fabric" chosen) hold the `.dc.html` sources and a small build that injects real knots from the generator. They are records, not inputs to the site.
