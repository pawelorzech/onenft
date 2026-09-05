# Roadmap

What is done, what is open, in the order it matters. Last verified: 2026-09-05.

## Done
- Generator in TypeScript and Solidity, byte-equal, tested.
- Token contract on Base mainnet and Base Sepolia, audited, Sourcify-verified.
- Site live: fabric layout, claim button (EIP-1193, no wallet library), chain-aware rows with gaps and owners, ENS names, "yours" marker, PNG link cards, RSS, legacy redirects.
- Author-day autoclaim in the site container.
- Day 1 claimed.

## Open, by priority
1. **Resilience.** Move `BASE_RPC_URL` to a dedicated RPC with a fallback; cache past-day ownership longer than 12 s (only today can change; transfers of past days are rare and can refresh hourly). Add an uptime check (owner must opt in to notifications).
2. **Basescan source verification.** Needs an Etherscan API key in `~/.config/etherscan/credentials.json`; then `forge verify-contract … --verifier etherscan`.
3. **Collection metadata on OpenSea.** Name, description, cover image, set by the owner in OpenSea's UI. `contractURI()` on-chain would need a new token contract.
4. **CI.** `.github/workflows/ci.yml` runs `bun test` and `forge test` on push; keep it green.
5. **Mobile wallets.** WalletConnect needs a project id; injected wallets only for now.
6. **Key hygiene.** Move ownership to a multisig once there is anything to protect; consider `lockRenderer` when the format is final.
7. **The off-chain channel.** RSS exists. The rest is writing and showing: a post explaining the format, a repost of each day. The plan's gate 3 (the format as a spec others implement) is the real measure; the page `/how` already invites it.

## Won't do (decided)
- Royalties / ERC-2981 on this contract.
- Light/dark toggle. Colors belong to the day.
- Per-address claim caps.
