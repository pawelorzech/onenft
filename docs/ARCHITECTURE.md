# Architecture

Last verified: 2026-09-05 (renderer v3)

## One number in, one knot out
1. **Clock.** `day = block.timestamp / 86400` (UTC calendar day). The site computes the same number from `Date.now()`; when a contract is configured it trusts `currentDay()` from the chain instead.
2. **Seed.** The day number goes through splitmix64 (`mix` in both languages). A counter starts at `mix(day)`; each draw increments the counter, mixes it, and takes the top bits.
3. **Traits (renderer v3, day 2 onward).** Seven draws set the traits, in this order: palette (8 bits mod 16), grid (4 bits into `GRIDS`: 6, 8, 10 or 12), weave (3 bits into `WEAVES`: arcs, passes, loose, cross), symmetry (3 bits into `SYMMETRIES`: none, mirror, quad, turn), weight (2 bits: thin, regular, heavy), caps (2 bits: 0 is butt, else round), accent (4 bits; 0 means an accent, then 2 bits pick flame, gold, sky or rose). Tables in `src/knot.ts` and `/spec.json`.
4. **Cells.** 3 bits per free cell in row order, mapped by weave to a state. States 0 and 1: quarter-arcs in two orientations. 2: vertical pass. 3: horizontal pass. 4: empty (loose). 5: crossing (cross). On accent days each non-empty free cell draws 4 more bits; 0 marks it. Under a symmetry the free cells are the left half (mirror) or the top left quarter (quad, turn); the rest copy their source, arcs flip under a mirror or a quarter turn, passes flip under a quarter turn.
5. **SVG.** One path string built cell by cell (cell 64 units, half 32), drawn twice: shadow (palette `shade`) under cord (palette `cord`), widths 13/5, 21/9 or 30/15 by weight, plus a third path in the accent color for marked cells. `viewBox` is `grid * 64` square, `width` and `height` are 512. Integer stroke widths on purpose: Solidity cannot print `64/3`.
6. **Token URI.** `KnotRendererV3.tokenURI(day, epoch)` returns `data:application/json;base64,…` with `name`, `description`, `image` (`data:image/svg+xml;base64,…`) and attributes Day, Epoch, Palette, Grid, Weave, Symmetry, Weight, Caps, Accent. A 12 by 12 day runs to about 5M gas in `eth_call`.
7. **Renderer v2 (day 1).** `src/knot_v2.ts` and `contracts/src/KnotRenderer.sol`, frozen: eight palettes, 8 by 8, arcs and passes (2 bits per cell), one shadow and one cord width. Day 1 was claimed with this renderer, so it keeps it forever. `knotFor(epoch)` in `src/knot.ts` picks v2 below `V3_FROM_EPOCH` (20702) and v3 from there; every page and image goes through it.

`contracts/fixtures.ts` renders a set of epochs from TypeScript into `contracts/test/fixtures/knots.json` (v2) and `knots_v3.json` (v3, 60 epochs with traits); `KnotRenderer.t.sol` and `KnotRendererV3.t.sol` assert `keccak256(svg)` equality and trait names for each. Any drift between the two implementations fails the build. `via_ir` is on in `foundry.toml`; v3 does not compile without it.

## Contracts (`contracts/src`)
- `OneNFT.sol` — ERC-721 (OpenZeppelin 5.x) + Ownable. `claim()` mints `tokenId = currentDay()` to `msg.sender`, or to `author` on author days (day % 10 == 0, day ≤ 1000). No price. `rendererOf[tokenId]` is set at claim. `tokenURI` delegates to that renderer. `setRenderer` (owner, probes the new renderer), `lockRenderer` (owner, one-way), `renounceOwnership` reverts. Constructor rejects `startEpoch` outside `[today, today+7]`. Uses `_mint` (EIP-7702 accounts break `_safeMint`).
- `KnotRenderer.sol` — v2, pure, frozen; `svg(epoch)`, `paletteName(epoch)`, `tokenURI(day, epoch)`, `cells(epoch)`.
- `KnotRendererV3.sol` — v3, pure; the same interface plus `cells(epoch)` returning traits, states and accent marks, and the trait name helpers.
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
