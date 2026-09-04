# onenft.click

One Truchet knot a day, computed from the Base block number. Nobody draws it and nobody can delay it.

## How it works

- **A day** is `blockNumber / 43200`, rounded down. At about 2 s per block that is close to a day, but the boundary drifts against wall-clock time. The chain is the clock.
- **The seed** is the day run through splitmix64. Eight bits pick the palette, then two bits per cell for an 8×8 grid.
- **Four cell states**: quarter-arcs in two orientations, a vertical pass, a horizontal pass.
- **Output**: one SVG path drawn twice (shadow and cord), about 5 kB, returned by the contract as a `data:` URI.
- **The page has no palette of its own.** It takes colors from today's palette, so it looks different in each of the eight epochs.

The full random stream is described on `/how`, so you can port it to any language. All arithmetic fits in uint64; the Solidity renderer reproduces the TypeScript output byte for byte.

## Run

```sh
bun test
PORT=3000 bun run src/server.ts
```

Env: `PORT`, `BASE_RPC_URL` (default `https://mainnet.base.org`), `START_EPOCH` (epoch of day 1, default 1178), `CONTRACT_ADDRESS` and `CHAIN_ID` (8453 mainnet, 84532 Sepolia) to read state from the contract and enable claiming. Without a contract the site runs as a plain renderer.

## Routes

- `/` the fabric: today and every earlier day
- `/day/N` one day, `/day/N.svg` the raw file (past days cached for a year)
- `/today.svg` today's knot
- `/how` the format
- `/health` healthcheck

## Contracts (`contracts/`, Foundry)

- `KnotRenderer.sol` ports `src/knot.ts` one to one. `test_SvgMatchesTypeScriptByteForByte` compares keccak of the SVG against fixtures from `bun run contracts/fixtures.ts`. TypeScript is the source of truth.
- `OneNFT.sol` is the ERC-721. `claim()` takes today's day (tokenId = day number). A day nobody claims stays empty forever. Every tenth day up to 1000 goes to the author. The renderer address is stored per token at claim time, so `setRenderer` touches future days only; `lockRenderer` is one-way. It uses `_mint`, not `_safeMint`: after EIP-7702 a normal wallet can be an account with delegation code that does not answer `onERC721Received`.
- Deploy: `contracts/deploy.sh sepolia|mainnet` (deployer key from Keychain, author address from `~/.config/onenft/author.json`, Sourcify verification).

## Plan

Gates: (1) public renderer without a wallet, (2) 90 days under my own name, (3) the format as a spec with code, (4) Base Sepolia, (5) mainnet, once a dozen strangers ask "can I have this".
