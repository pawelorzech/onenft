# Two new onenft collections: research synthesis and plan

Research date: 2026-09-05. Four researchers (Claude, Gemini, Grok, Perplexity), cross-checked. Every URL below returned 200 on 2026-09-05. Gas and auction parameters were read live from chain.

## Context

knot, blit and chainrun mint one free token per UTC day; that is the slowest-growing shape possible. Paweł wants collections under the onenft brand that more people can mint, still CC0, with a price in pennies and a treasury that always gets something. Decided 2026-09-05: first two separate projects, then only faces; arms is parked. Paweł accepts that ETH received is JDG revenue and will settle it with his accountant before mainnet.

1. **Project A, `faces.onenft.click`**: original pixel avatars; free random roll, paid pins for some traits, rarities and 1/1s on chain (changed 2026-09-05 from the 8 h auction idea).
2. ~~Project B, arms~~: parked the same day; see below.

Both are branches of onenft.click: subdomains, entries in the hub, the same wallets, deploy scripts and hosting as knot, blit and chainrun. Art prototypes reviewed by Paweł on 2026-09-05 from `scratchpad/heraldry.ts`, `scratchpad/pfp.ts` (rendered sheets `arms.png`, `arms-prints.png`, `faces.png`); the generators move into the new repos as the TypeScript source of truth.

## What the research settled

**Auctions.** [HIGH]
- Every Nouns-lineage fork burns the token when nobody bids. None has a free-claim path. Live parameters today: Nouns 24 h / reserve 2.8 ETH / +2 % / 5 min buffer; Lil Nouns 15 min / 0.15 ETH / +5 % / 90 s; Gnars (Base) 4 h 20 m / 0.01 ETH / +10 % / 5 min; Purple 24 h / 0.05 ETH / +10 %.
- The anti-snipe buffer resets the end to now + buffer, not a fixed extension. Settlement is permissionless and unpaid everywhere, and the clock drifts to settlement time; onenft anchors to the chain clock instead, which is a deliberate divergence.
- A 0-reserve auction where 0 wins is a free claim for the cheapest bot. Reserve must be non-zero.
- Template: Nouns Builder `Auction.sol` (has `nonReentrant` on bid and settle where Nouns V3 does not, treasury/founder BPS split, and the out-of-gas vs named-revert distinction in `_createAuction`). Audits: Code4rena 2022-09 (5 High, 28 Medium, all fixed; params-mutable-mid-auction is now `whenPaused`), Sherlock 2024-11 for Nouns V3. Do not use Zora v3 ReserveAuction (deprecated) or thirdweb MarketplaceV3 (upgradeable, and its buyout path had a critical bug).
- Refunds: push with a 50k-gas call and WETH fallback, so a reverting bidder cannot block being outbid.

**Free or cheap mints.** [HIGH]
- Free + capped + instant is a bot subsidy. Every project that avoided it removed the race: Checks ($8, 24 h window, uncapped, 16,031), Opepen (free, 60 min, 16,000), Nouns (price). Per-wallet caps and `tx.origin == msg.sender` are dead as defences after EIP-7702 (Pectra, 2025-05-07). Base Verify is Sepolia-only.
- A non-zero price kills the spam incentive; a project with no token and no airdrop is a poor farming target anyway. [MED]
- Precedents for a creator share: Nouns every 10th id for 5 years, Lil Nouns 20 %, Loot tail 2.8 %, Chain Runners 0.85 %. All stated up front, none contested.

**Gas.** [HIGH, measured] Base base fee 0.005 gwei, ETH $2,479: mint about $0.001, settle about $0.005, bid with refund about $0.0015. The knot renderer uses about 1.25 M gas against a 50 M `eth_call` cap. ERC721A brings nothing for single mints; stay on OpenZeppelin 5.x `ERC721` + `Ownable`, no `Enumerable`.

**Tax (Poland, ryczałt).** [MED, confirm with a doradca] NFTs are not "waluta wirtualna" per KIS, so primary-sale ETH is business revenue valued in PLN on receipt, no deductions; converting that ETH later is a second event on PIT-38 at 19 %. VAT on token sales is an open question. Bookkeeping: one PLN valuation per settle or mint.

**Distribution.** [HIGH for Base App and Zora] Base App ended creator rewards 2026-02-15 and dropped the Farcaster feed; ZORA fell about 95 %; Rodeo shut down 2026-03-10. No channel will carry a collection by itself. Fully on-chain art outlived every platform.

## Project A: faces, a game of rolling your own avatar (replaces the 8 h auction, 2026-09-05)

Paweł's brief: mint for free and get a random avatar; pay extra to pin a trait you want, but not every trait can be pinned, some stay random; rarities and 1/1s live in the contract; it should feel like a game. Art: **Ink 3** (24x24 or 32x32, black outline, dithered ground, rim light), with many more backgrounds and layers, "the more combinations the better".

Proposed mechanics, open for discussion:
- **Roll:** one roll per wallet per UTC day, free or with pins (Paweł, 2026-09-05 evening: "codziennie jeden, za darmo albo z pinami"). No second paid roll the same day. Seed = keccak(prevrandao, sender, tokenId). On the OP stack `prevrandao` is the L1 randao, fine for art, not for money.
- **Pins:** `mint(pins)` where `pins` names up to 3 of the pinnable layers (background, hair or hat, eyes, top). Skin, head shape, mouth and accessory are never pinnable. Price rises with the number of pins: 1 pin 0.0005 ETH, 2 pins 0.0015, 3 pins 0.004. A pinned value must be common or uncommon; rare and legendary values cannot be bought, only rolled.
- **Rarity:** weight tables on chain per layer, as in Chain Runners. Tiers: common, uncommon, rare, legendary, with the tier in the metadata. A legendary background or hat is a few in ten thousand rolls.
- **1/1s:** a small set of unique full sprites (say 25). Each roll has a tiny chance to hit the 1/1 pool; a hit mints that 1/1 and removes it from the pool forever. 1/1s cannot be pinned.
- **Supply:** cap 10,000 including 1/1s. **Treasury: one random roll a day**, like any wallet (Paweł, 2026-09-05 evening: "jeden randomowy dziennie do treasury, może być 1/1"). `rollForTreasury()` is permissionless, mints to the author wallet, no pins, same one-a-day rule; the site loop calls it from the deployer. No tail, no every-Nth id.
- **Reroll:** none in v1. A second free roll is tomorrow's mint. Keeps the contract small and the game honest.
- **Money:** pin fees go straight to the author wallet, no balance held. This is JDG revenue like the arms mints.
- **Contract:** `OneNFT.sol` shape plus weights and pin logic; renderer swappable per token as now; sprites and weights in `DataStore` contracts. Sprites are the first design task (Ink 3 sprite sheet, reviewed layer by layer).
- **Site:** a builder, not a button. Four galleries of pinnable items (background, top, eyes, hair) with thumbnails of every common and uncommon item, a preview that shows the pinned items in place and a question mark on every layer luck decides, the price updating with each pin, then the roll. Rarity table, the 1/1 gallery with what is still in the pool, holder pages.

Decided 2026-09-05: **32x32**, free roll **1 per wallet per UTC day**, **cap 10,000**, treasury gets one random roll a day, pinnable layers **background, hair or hat, eyes, top** (max 3 pins). Evening decisions: **skin tone is a fifth pin** (human tones only, common/uncommon; fantasy tones rare/legendary, luck only), more skins (21), accessories (24) and mouths (17, joint included); **50 one of ones**, odds **poolLeft / tokensLeft** per unpinned roll (a fixed 1 in 10,000 would have left most of the pool unrolled); supply stays 10,000. Pins are a uint64, one byte per key: background, top, eyes, hair, skin, three spare.

## Project B: arms, parked (Paweł, 2026-09-05: "możemy tych tarcz w ogóle nie robić")

The heraldry prototype stays in the scratchpad (`heraldry.ts`, `styles.ts` armsPixel, pixel shield v2 accepted) in case it comes back. No repo, no contract, no site for now.

## Parameters at a glance

| | A: faces | B: arms |
|---|---|---|
| Cadence | any time, 1 free roll per wallet per day | one design per UTC day |
| Price | roll free; pins 0.0005 / 0.0015 / 0.004 ETH | 0.0005 ETH flat |
| Limit | cap 10,000 | window + 1,000/day + 1/wallet/day |
| Treasury | one random roll a day + pin fees | parked |
| Randomness | prevrandao + sender + id | none, day number |
| Rarity | weight tables, 4 tiers, 25 1/1s | blazon components |

## Implementation order (faces only)

1. **Sprite sheet first, code second.** Repo `~/Programowanie/onenft-faces` cloned from `onenft-chainrun` (closest: pixel layers in `DataStore`, weight tables, splitmix64 in `src/runners.ts`). Redraw Ink 3 at 32x32 in `src/sprites.ts`: 8 layers (background, body/top, head shape, skin tone, eyes, mouth, hair or hat, accessory), aim for 12 to 20 values per pinnable layer and 6 to 10 per random layer, plus 25 full 1/1 sprites. Backgrounds get the most variety: flat, dithered, split, gradient bands, patterns. Render a contact sheet per layer with `render.ts`-style tooling and get Paweł's OK layer by layer before Solidity.
2. **Generator** `src/faces.ts`: seed to traits via weight tables (tiers common/uncommon/rare/legendary), pins override only pinnable layers and only common/uncommon values, 1/1 pool check, SVG of `<rect>` runs with `shape-rendering="crispEdges"`. Tests: pins respected, unpinnable ignored, rare values never pinnable, 1/1 removed after hit, byte-equal fixtures.
3. **Contract** `contracts/src/OneNFT.sol` reshaped: `roll()` free with `lastRollDay[wallet]`, `roll(pins)` payable with price by pin count, seed = keccak(prevrandao, sender, tokenId), weights and 1/1 pool on chain, treasury ids by rule, fees forwarded to `author`, renderer pinned per token, `lockRenderer`, `_mint` not `_safeMint`. Renderer `FaceRenderer.sol` + `DataStore`s, byte-equal to TS; gas of `tokenURI` under 10 M (`forge test --gas-report`).
4. **Site** from the chainrun site: roll button, pin picker with live price, rarity table, 1/1 gallery, holder pages, JSON API, PNG cards. Copy rules and design rules as in the sisters; no light/dark toggle.
5. **Hub**: one entry in `~/Programowanie/onenft-hub/src/collections.ts`; fix the stale-tally bug (below) in the same change or before.
6. **Sepolia first**, then mainnet. (Tax note dropped by Paweł.)
7. **Second look** on the contract by a non-forked agent (Forge or Cato) before mainnet: randomness, pin pricing, 1/1 pool, treasury ids.

## Done on 2026-09-05 (evening)

- Repo `github.com/pawelorzech/onenft-faces`: sprites (7 slots, 50 one of ones), generator, contracts, Foundry tests byte-equal to TS, site with the builder, API, cards, treasury loop.
- Base Sepolia deployed and checked (`~/.config/onenft-faces/deploy-sepolia.json`); `faces-test.onenft.click` wired with the deployer key, the treasury loop rolled its first face. `faces.onenft.click` live without a contract. Hub lists Faces as a rolls collection; the stale-tally fix shipped with it.
- Sepolia redeployed with 50 one of ones (`0x1D62…c0D2`), both contracts verified on Sourcify (exact match, by hand with `forge verify-contract`; `forge script --verify` cannot decode the renderer's `address[]` argument, so `deploy.sh` uses `forge create` for renderer and token). A three-pin paid roll from the deployer worked end to end. Log scan starts at the deploy block.
- Cato's audit found one critical flaw (a one-step roll could be tried and reverted for free) plus renderer-probe and meta-invariant gaps; all fixed: commit-reveal, probes of every path, meta checks, coverage test, sweep. Later the same evening: seven pin keys (plus hair colour and ground), no pin cap, price doubling per pin, fee split 95/5 author/keeper. Sepolia redeployed (`0xfD54…38e1`, renderer `0xBaF3…4472`), verified, a five-pin commit paid the split correctly.
- Late evening: everything common or uncommon can be pinned (12 keys, uint128), price doubles per pin, fee 95/5 author/keeper, human skins all common, mask hides the mouth, sticky preview, galleries pattern-next-to-colour. Trait edits after the roll: not in v1. **Base mainnet deployed 2026-09-05**: OneNFT `0x37747e1c6221848807B2fA060dbf4Be798361752`, renderer `0x0e5a1223042a7f266C5d22229751750861E89EBf`, verified on Sourcify; prod wired with the keeper key; hub carries the address.

## Side finding: hub tally stale after a claim (2026-09-05)

Paweł saw the hub at onenft.click show "0 days taken" for knot after day 1 was claimed, and a reload did not fix it. Probed live: for a while the hub's JSON returned knot `today.state: "free"` next to `tally.taken: 1`, then settled on `taken / 1`. Three caches stack: the hub HTML and JSON go out with `cache-control: public, max-age=60` (browser keeps a stale page on reload), the hub keeps each collection in memory for 60 s and keeps the last good answer on any error, and each collection caches chain state (`src/contract.ts` TTL) so `/api/today` and `/api/days` can straddle a refresh. Worst case is two to three minutes of wrong numbers and mixed tiles right after a claim. Fix, separate small task in `onenft-hub`: serve HTML with `no-store` like the collections do, drop the hub TTL to 20 s, and take `today` from the `/api/days` payload (last entry) instead of a second request so one snapshot feeds both the tile and the tally.

## Verification

- `bun test`: trait tables sum to 10,000, pins, tiers, 1/1 pool, treasury id rule, byte-equal SVG fixtures.
- `cd contracts && forge test`: same rules in Solidity, roll limit per day, price by pin count, fee forwarding, rare value rejected as a pin, renderer lock, gas report on `tokenURI`.
- Sepolia: roll from two wallets on one day, second roll from one wallet reverts, a 3-pin roll charges 0.004 ETH and the author wallet receives it, pinned traits appear in `tokenURI`, treasury ids land in the author wallet via the site loop.
- Claude in Chrome on the Sepolia site: roll, pin picker price updates, rarity table, 1/1 gallery, holder page, OpenSea preview of a minted token.

## Sources (verified 200 on 2026-09-05)

- https://github.com/nounsDAO/nouns-monorepo/blob/master/packages/nouns-contracts/contracts/NounsAuctionHouseV3.sol
- https://github.com/nounsDAO/nouns-monorepo/blob/master/packages/nouns-contracts/contracts/NounsToken.sol
- https://github.com/ourzora/nouns-protocol/blob/main/src/auction/Auction.sol
- https://github.com/ourzora/nouns-protocol/blob/main/src/token/Token.sol
- https://code4rena.com/reports/2022-09-nouns-builder
- https://github.com/code-423n4/2022-09-nouns-builder-findings/issues/450
- https://github.com/sherlock-audit/2024-11-nounsdao
- https://blog.thirdweb.com/2023-09-09-vulnerability-auctions-with-a-buyout-price/
- https://mechanism.institute/library/nouns-auction/
- https://classic.lilnouns.wtf/
- https://techcrunch.com/2021/09/03/loot-games-the-crypto-world/
- https://nftplazas.com/checks-nft-collection/
- https://www.jack.art/opepen-edition
- https://niftypins.io/blitmap-flipmap-cc0/
- https://jeremy.felder.link/chain-runners-breakdown
- https://docs.zora.co/coins/contracts/rewards
- https://www.bankless.com/nfts-on-rodeo
- https://coinmarketcap.com/academy/article/base-app-ends-creator-rewards-shifts-to-trading
- https://www.odaily.news/en/post/5211890
- https://eips.ethereum.org/EIPS/eip-7702
- https://quantstamp.com/blog/will-eip-7702-affect-your-code
- https://docs.base.org/apps/guides/verify-onchain
- https://docs.base.org/base-chain/network-information/network-fees
- https://docs.openzeppelin.com/contracts/5.x/api/token/erc721
- https://bueno.art/blog/allowlist-mint
- https://cryptoslate.com/the-saudis-hits-number-1-on-opensea-as-bots-claim-free-mint-scammers-attack-discord/
- https://www.gazetaprawna.pl/podatki/artykuly/10797860,nft-tokeny-sprzedaz-vat-podatek-dochodowy-interpretacja-kis.html
- https://litigato.pl/opodatkowanie-dochodow-z-nft-w-polsce/
- https://www.podatki.gov.pl/pit/rozliczenie-ze-sprzedazy-kryptowalut/
