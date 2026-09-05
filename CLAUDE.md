# onenft.click

One Truchet knot a day, computed on-chain from the clock of the Base chain. Live at https://onenft.click, contract on Base mainnet. This file is what a fresh session needs to continue the work. Operational identifiers that should not be public live in `CLAUDE.local.md` (gitignored).

## What this is

- Every UTC day the contract can mint exactly one ERC-721 token, `tokenId = day number` (day 1 = 2026-09-05). A day nobody claims stays empty forever; the gaps are part of the work.
- The image is generated fully on-chain by a separate renderer contract from the day number alone. The TypeScript in `src/knot.ts` and the Solidity in `contracts/src/KnotRendererV4.sol` produce the same SVG byte for byte; a Foundry test enforces that against fixtures generated from TS. **TypeScript is the source of truth.** Renderer v2 (`src/knot_v2.ts`, `KnotRenderer.sol`) is frozen and renders day 1 only; `knotFor(epoch)` picks the version, and every page and image must go through it, never `renderKnot` directly (except previews of future days).
- Ten traits per day (palette, grid, weave, symmetry, weight, caps, accent, style, ground, inverted), all in the token metadata and on `/traits`. Everything is CC0, stated on `/assets`.
- The website has no palette of its own. It takes colors from today's palette, so it looks different in each of the sixteen epochs. There is no light/dark toggle and there must not be one.
- Every tenth day up to 1000 goes to the author. The site's autoclaim loop claims those from the deployer wallet.
- Not an investment, no price, no royalties (decided; a new contract with ERC-2981 was offered and declined). Owner's cut is the author days.

## Stack and commands

- Bun + TypeScript for the site (`src/`), Foundry for contracts (`contracts/`), OpenZeppelin 5.x. Never npm/npx, never Python for project code.
- `bun test` (site, 46 tests) · `cd contracts && forge test` (19 tests, needs `via_ir`) · `bun run contracts/fixtures.ts` regenerates the byte-equality fixtures after any change to `src/knot.ts` (then the Solidity test must still pass). Never touch `src/knot_v2.ts` or `contracts/src/KnotRenderer.sol`.
- `PORT=3000 bun run src/server.ts` runs the site. With `CONTRACT_ADDRESS` + `CHAIN_ID` it reads chain state and shows the claim button; without them it is a plain renderer.
- `contracts/deploy.sh sepolia|mainnet` deploys renderer + token (Sourcify verification). `contracts/deploy-renderer.sh` deploys a renderer alone; `contracts/set-renderer.sh` switches the token to it from the author wallet (1Password). `contracts/wire.sh sepolia|mainnet` writes the deployed addresses into the hosting env and redeploys the site. `scripts/status.sh` prints on-chain and site state.
- Deploy of the site = `git push origin master` then trigger the hosting redeploy (see `CLAUDE.local.md`). The Dockerfile must copy `assets/` (fonts for PNG cards) and run `bun install`.

## Rules that bite

- **Do not change `src/knot.ts` output casually.** Past days are already minted with the on-chain renderer; changing the TS changes the site's images but not the chain's. If a change is intended, deploy a new renderer and switch with `setRenderer` from the author wallet; it affects future days only.
- **All copy in English**, plain words, active voice, no adverbs, no em dashes, nothing a reader could misunderstand. Facts (numbers, addresses, paths) stay exact. Run new copy through the `stop-slop` and `bro` rules before shipping.
- **No AI-default design tells**: no cream + terracotta, no black + acid green, no ALL-CAPS eyebrows, no middle-dot metadata, no mono for small labels, no arrows in buttons.
- Public repo: never commit keys, RPC keys, hosting tokens. Secrets live in Keychain / 1Password / hosting env.
- The contract is immutable. Bugs in `OneNFT.sol` mean a new contract. The renderer is the only swappable piece.

## Frontend Theme

- Palette: none of its own; `--bg/--fg` come from today's palette (`src/knot.ts` PALETTES), derived `--muted/--line/--soft` via `mix()` in `src/site.ts`.
- Typography: Syne 700/800 for display and numbers, Newsreader 400 for text (Google Fonts on the site, static TTFs in `assets/fonts/` for PNG cards).
- Shapes: no border radius, 1px hairlines in `--line`, solid CTA in `--fg` on `--bg`.
- Density: sidebar 360px sticky, rows 128px, today block 396px knot; stacks below 1180px, single column below 900px.
- Motion: none on load; 150ms row hover only; countdown updates every 15s.

## Where things are

| Thing | Path |
|---|---|
| Generator (source of truth) | `src/knot.ts` |
| Clock, day math | `src/chain.ts` |
| Page HTML, CSS, copy | `src/site.ts` |
| Inner pages: explore, traits, holder, assets, embed | `src/pages.ts` |
| JSON API, spec, calendar | `src/api.ts` |
| Server, routes, legacy redirects | `src/server.ts` |
| Chain reads (viem, multicall) | `src/contract.ts` |
| Author-day autoclaim | `src/autoclaim.ts` |
| PNG link cards (resvg) | `src/image.ts` |
| ENS reverse lookup | `src/ens.ts` |
| Contracts, tests, deploy script | `contracts/` |
| Design rounds (Claude Design canvases) | `design/`, `design2/` |
| Decisions log | `docs/DECISIONS.md` |
| Deployments and addresses | `docs/DEPLOYMENTS.md` |
| Runbook | `docs/OPERATIONS.md` |
| How it works, end to end | `docs/ARCHITECTURE.md` |
| Audit findings and status | `docs/AUDIT.md` |
| What is next | `docs/ROADMAP.md` |
