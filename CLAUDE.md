# knot.onenft.click

Last verified: e562c14 | 2026-10-26

One Truchet knot a day, computed on-chain from the clock of the Base chain. Live at https://knot.onenft.click (moved from the root of onenft.click on 2026-09-05; the root is the landing, repo `~/Programowanie/onenft/hub`), contract on Base mainnet. First collection and the trunk the others inherit from. Shared rules (stack, deploy, copy, design, secrets, TS = source of truth): `../CLAUDE.md`. Operational identifiers: `CLAUDE.local.md` (gitignored).

## What this is

- Every UTC day the contract can mint exactly one ERC-721 token, `tokenId = day number` (day 1 = 2026-09-05). A day nobody claims stays empty forever; the gaps are part of the work.
- The image is generated fully on-chain by a separate renderer contract from the day number alone. `src/knot.ts` and `contracts/src/KnotRendererV4.sol` produce the same SVG byte for byte (Foundry test against fixtures from TS). Renderer v2 (`src/knot_v2.ts`, `KnotRenderer.sol`) is frozen and renders day 1 only; `knotFor(epoch)` picks the version, and every page and image must go through it, never `renderKnot` directly (except previews of future days).
- Ten traits per day (palette, grid, weave, symmetry, weight, caps, accent, style, ground, inverted), all in the token metadata and on `/traits`. Everything is CC0, stated on `/assets`.
- The website takes colors from today's palette, so it looks different in each of the sixteen epochs. No light/dark toggle and there must not be one.
- Every tenth day up to 1000 goes to the author. The site's autoclaim loop claims those from the deployer wallet.
- Not an investment, no price, no royalties (decided; a new contract with ERC-2981 was offered and declined).

## Commands and rules that bite

- `bun run contracts/fixtures.ts` regenerates the byte-equality fixtures after any change to `src/knot.ts` (then `cd contracts && forge test` must still pass; needs `via_ir`). **Never touch `src/knot_v2.ts` or `contracts/src/KnotRenderer.sol`.**
- Renderer swap: `contracts/deploy-renderer.sh` deploys a renderer alone; `contracts/set-renderer.sh` switches the token to it from the author wallet (1Password). `contracts/deploy.sh` also does Sourcify verification.
- The Dockerfile must copy `assets/` (fonts for PNG cards) and run `bun install`.
- Changing `src/knot.ts` changes the site's images but not the chain's; past days are already minted with the on-chain renderer.
- Bugs in `OneNFT.sol` mean a new contract.
- Run new copy through the `stop-slop` and `bro` rules before shipping.

## Frontend Theme

- Palette: none of its own; `--bg/--fg` come from today's palette (`src/knot.ts` PALETTES), derived `--muted/--line/--soft` via `mix()` in `src/site.ts`.
- Typography: Syne 700/800 for display and numbers, Newsreader 400 for text (Google Fonts on the site, static TTFs in `assets/fonts/` for PNG cards).
- Shapes: no border radius, 1px hairlines in `--line`, solid CTA in `--fg` on `--bg`.
- Density: sidebar 360px sticky, rows 128px, today block 396px knot; stacks below 1180px, single column below 900px.
- Motion: none on load; 150ms row hover only; countdown updates every 15s.

## Docs

`docs/`: DECISIONS.md (decisions log), DEPLOYMENTS.md (addresses), OPERATIONS.md (runbook), ARCHITECTURE.md, AUDIT.md, ROADMAP.md. Design rounds: `design/`, `design2/`.
