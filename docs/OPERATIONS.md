# Operations runbook

Last verified: 2026-09-05

## Steady state
The contract mints on demand. The site reads the chain every 12 s. The autoclaim loop inside the site container checks every 5 min and claims author days (10, 20, … 1000) from the deployer wallet. `scripts/status.sh` prints everything worth knowing in one screen.

## Deploy the site
1. `bun test` and `cd contracts && forge test` are green.
2. `git push origin master`.
3. Trigger the hosting redeploy (identifiers in `CLAUDE.local.md`). Wait until `/health` shows `ok, day N, …, contract 0x…`.
4. Open the site in a real browser at about 1000 px and 1440 px. The heading must fit the sidebar and the console must be clean.

## Deploy contracts (new network, or a new token contract)
`contracts/deploy.sh sepolia|mainnet` reads the deployer secret from Keychain and the author address from `~/.config/onenft/author.json`, deploys renderer and token with `START_EPOCH` = today unless overridden, verifies on Sourcify, and writes `~/.config/onenft/deploy-<net>.json`. Then `contracts/wire.sh <net>` pushes the addresses into the hosting env and redeploys the site. The constructor rejects a `startEpoch` in the past or more than 7 days ahead.

## Swap the renderer (affects future days only)
1. Freeze the old generator as `src/knot_vN.ts` (the site keeps rendering old days with it through `knotFor`), then change `src/knot.ts` and the new `contracts/src/KnotRendererVN.sol` together. Run `bun run contracts/fixtures.ts`, then `forge test`; the byte-equality test must pass.
2. `contracts/deploy-renderer.sh sepolia|mainnet` deploys the renderer alone from the deployer wallet, verifies on Sourcify and writes `KnotRenderer_v4` into `~/.config/onenft/deploy-<net>.json`. (Edit the script for the next version.)
3. `contracts/set-renderer.sh sepolia|mainnet` reads the author secret from 1Password for one transaction and calls `setRenderer`. The contract probes `tokenURI(1, currentEpoch)` and rejects a renderer that does not answer. The author wallet needs a little ETH.
4. Set `V4_FROM_EPOCH` in the site env if the switch did not land on the planned day, and record the address in `docs/DEPLOYMENTS.md`.

## Freeze the renderer for good
`cast send <OneNFT> "lockRenderer()"` from the author wallet. One-way. Do it once the format is final.

## Gas
- The deployer holds gas for deploys and autoclaims. A claim costs about 75k gas, a fraction of a cent on Base. Top up below about 0.0005 ETH.
- The author wallet needs gas only for owner calls. Send a little from the deployer: `cast send <author> --value 0.0003ether`.

## Moving test ETH to Base Sepolia
Faucets often pay on Ethereum Sepolia. Send plain ETH to the L1StandardBridge `0xfd0Bf71F60660E2f608ed56e1659C450eB113120` on Ethereum Sepolia; it lands on the same address on Base Sepolia within minutes.

## If the site is down
The chain and the images are unaffected. The autoclaim loop is not running, so an author day can become a gap. Claim it by hand from the deployer: `cast send <OneNFT> "claim()"`.

## If the public RPC misbehaves
Set `BASE_RPC_URL` in the hosting env to a dedicated endpoint (Alchemy or QuickNode free tier) and redeploy. The site logs "contract state unavailable" when reads fail.

## Marketplaces
- Basescan token pages fetch metadata lazily. "Refresh Metadata" works only from a logged-in Basescan account.
- OpenSea reads `tokenURI` on its own. Collection settings (name, description, image, creator earnings) are edited by the contract owner in OpenSea's UI.
