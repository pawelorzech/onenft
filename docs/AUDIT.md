# Audit

Cross-vendor read-only audit of `OneNFT.sol` and `KnotRenderer.sol` on 2026-09-05, before the mainnet deploy, plus a second pass on the fixes. Verdict of the second pass: **GO**.

## Findings and what happened to them

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | High | `setRenderer` accepted any non-zero address; a codeless or reverting renderer pinned to a token bricks `tokenURI` forever. | Fixed. `_checkRenderer` requires code and a successful `staticcall` to `tokenURI(1, epoch)` returning ≥ 96 bytes; applied in the constructor and in `setRenderer`. Second pass pointed out the first version probed `svg()` while the token calls `tokenURI()`; corrected. |
| 2 | High | `startEpoch` had no on-chain sanity check; a late deploy would skip days silently. | Fixed. Constructor reverts unless `startEpoch ∈ [today, today+7]`. `deploy.sh` defaults `START_EPOCH` to today. |
| 3 | High | Day keyed on `block.number / 43200`; Base has signalled shorter blocks, which would shrink the day in an immutable contract. | Fixed by decision: clock is `block.timestamp / 86400`. |
| 4 | Medium | Owner and payout key are the same wallet; `renounceOwnership` would freeze the renderer while `rendererLocked` reads false. | Partly fixed: `renounceOwnership` reverts. Owner = author kept (single-person project); a multisig is on the roadmap. |
| 5 | Medium | On an author day any caller's `claim()` mints to the author and the caller pays gas for nothing. | Accepted and documented in NatSpec. The site hides the button on author days; the autoclaim loop claims from the deployer. Keeping it claimable by anyone means author days are never lost. |
| 6 | Low | `epochOf(0)` underflow only when `startEpoch == 0`. | Unreachable given finding 2's guard. |
| 7 | Low | No per-address cap; a bot can take every non-author day. | Accepted. First-come is the design. |

## Checked and clean
- `tokenURI` gas about 1.27M, output about 8.5 kB; far below public RPC `eth_call` limits.
- Metadata JSON cannot be broken by any interpolated value (decimals and fixed palette names only).
- No reentrancy: `claim()` makes no external call; `rendererOf` is written before `_mint`.
- `secondsLeft()` cannot underflow. Sequencer timestamp drift is bounded and monotonic; a day boundary can slip by minutes, never rewind.
- `renounceOwnership() public pure override` is a legal mutability narrowing in OZ 5.x; `transferOwnership(0)` also reverts, so ownership is permanent.

## Not covered
- Economic or social attacks (sniping every day) are by design.
- The site and the autoclaim loop are off-chain and were not part of the audit.
