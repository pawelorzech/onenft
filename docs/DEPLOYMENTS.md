# Deployments

Last verified: 2026-09-05 12:00 (UTC+2)

## Base mainnet (chainId 8453)

| Contract | Address | Notes |
|---|---|---|
| OneNFT (ERC-721, `ONAD`) | `0xb3b83788b9E6ccCb2379c3445dEF0627cf45E783` | startEpoch 20701, owner = author. Sourcify verified. Basescan source verification pending (needs an Etherscan API key). |
| KnotRenderer v1 | `0x37a62Fab1E1A49EaB4A980819056208dCAC79528` | Pinned to day 1 forever. Its description text says "block number". |
| KnotRenderer v2 (current) | `0xa50eE76182d6489495Db9CD9b7fFeBb70e0d747F` | Description says "clock of the Base chain". Set via `setRenderer`, tx `0x1a48bd2c11011e7c9f0e342007c582b82278bb532b2839e33307150f021b3804` from the author wallet. |

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
| KnotRenderer v2 (current) | `0x26F88bA025325190988280F2615df447078571B5` |

An earlier Sepolia pair (`0xb3b8…E783` / `0x37a6…9528`, the same addresses as mainnet because of identical deployer nonces) predates the audit fixes and is abandoned.

## Site

- https://onenft.click reads the mainnet contract. https://test.onenft.click reads the Sepolia contract.
- Docker image from `Dockerfile` (oven/bun:1-slim; copies `src/` and `assets/`, runs `bun install`). Health at `/health`.
- Routes: `/`, `/day/N`, `/day/N.svg`, `/day/N.png`, `/today.svg`, `/today.png`, `/how`, `/feed.xml`, `/health`. Legacy Polish paths (`/doba/N`, `/dzis.svg`, `/format`, `/zdrowie`) redirect with 301.
- The autoclaim loop runs inside the site container when `DEPLOYER_KEY` is set; the log line to look for is "autoclaim armed".
