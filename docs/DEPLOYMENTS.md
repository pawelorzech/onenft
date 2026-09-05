# Deployments

Last verified: 2026-09-05 15:10 (UTC+2)

## Base mainnet (chainId 8453)

| Contract | Address | Notes |
|---|---|---|
| OneNFT (ERC-721, `ONAD`) | `0xb3b83788b9E6ccCb2379c3445dEF0627cf45E783` | startEpoch 20701, owner = author. Sourcify verified. Basescan source verification pending (needs an Etherscan API key). |
| KnotRenderer v1 | `0x37a62Fab1E1A49EaB4A980819056208dCAC79528` | Pinned to day 1 forever. Its description text says "block number". |
| KnotRenderer v2 | `0xa50eE76182d6489495Db9CD9b7fFeBb70e0d747F` | Same image as v1, description says "clock of the Base chain". Set via `setRenderer`, tx `0x1a48bd2c11011e7c9f0e342007c582b82278bb532b2839e33307150f021b3804`. Never minted a token: day 1 carries v1, day 2 onward carries v4. |
| KnotRendererV3 (current) | `0x123Bc353e2a17D28C7AF375E2E948d8c54dcC13E` | Seven traits, sixteen palettes, CC0 in the description. Sourcify verified. Set via `setRenderer`, tx `0x29ed692c12b48e613b9f8e540d5f072c94c49f29af2f1ee2a20ab9bbe2d0246f` from the author wallet on day 1 (2026-09-05 12:00 UTC). |

- Deployer `0x7f28c8c9171b13F1E2fea21b6f2c8d4f91F892F3`; author and owner `0x6e36Dc3ec2F9D4f3D8e616725fB6Fa184CD9aE20`.
- Day 1 claimed by `pawelorzech.eth` (`0x84Cf6667FdE676a5950730720b67d62B9AB476Df`), tx `0x46e17275cddd1ffea0d3a3beffc21126ea6c82fb6265a7340a782e85b597fedf`, block 50889070.
- Deploy cost: about 2.5M gas, 0.000019 ETH.
- OpenSea collection: https://opensea.io/collection/onenft-click
- Basescan: https://basescan.org/address/0xb3b83788b9E6ccCb2379c3445dEF0627cf45E783

## Base Sepolia (chainId 84532)

| Contract | Address |
|---|---|
| OneNFT | `0xd384BA3C6FB7e4a4a6B275a600CdD1525286dC2c` |
| KnotRenderer v1 | `0x603fEDc25bfC636991d3575f35d65bAbCDCC442a` |
| KnotRenderer v2 | `0x26F88bA025325190988280F2615df447078571B5` |
| KnotRendererV3 (current) | `0xF5B0c6f8C0937C5F4cF22921a9427B18e1340517` | Set via tx `0xa365dd803f3263d9250d7f8ff41404352a5ff2b242fb4bfcd322ff37687d4424`. Contract created at block 46399490 (`CONTRACT_BLOCK` on the test app). |

An earlier Sepolia pair (`0xb3b8…E783` / `0x37a6…9528`, the same addresses as mainnet because of identical deployer nonces) predates the audit fixes and is abandoned.

## Site

- https://knot.onenft.click reads the mainnet contract (until 2026-09-05 the site sat at the root, https://onenft.click; the root now redirects old paths there). https://test.onenft.click reads the Sepolia contract.
- Docker image from `Dockerfile` (oven/bun:1-slim; copies `src/` and `assets/`, runs `bun install`). Health at `/health`.
- Routes: `/`, `/day/N`, `/day/N.svg`, `/day/N.png`, `/preview/N.svg` (next 7 days), `/today.svg`, `/today.png`, `/how`, `/explore`, `/traits`, `/assets`, `/embed`, `/wordmark.svg`, `/0x…` and `/name.eth`, `/api/today`, `/api/day/N`, `/api/days`, `/api/holder/A`, `/spec.json`, `/calendar.ics`, `/feed.xml`, `/health`.
- Env for the log scan: `CONTRACT_BLOCK` (first block to scan for `Claimed`; default 50880000 on mainnet, 46399490 set on the test app), `LOG_CHUNK` (default 10000). `V4_FROM_EPOCH` (default 20702) tells the site which days to render with v4. Legacy Polish paths (`/doba/N`, `/dzis.svg`, `/format`, `/zdrowie`) redirect with 301.
- The autoclaim loop runs inside the site container when `DEPLOYER_KEY` is set; the log line to look for is "autoclaim armed".
