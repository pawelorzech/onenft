#!/usr/bin/env bash
# Switches the token contract to KnotRendererV4 from the author wallet (the owner).
# Usage: contracts/set-renderer.sh sepolia|mainnet
# The author signs with the encrypted onenft-author Foundry keystore.
set -euo pipefail
source "$(dirname "$0")/../scripts/operator-safe.sh"
NET="${1:?sepolia|mainnet}"
case "$NET" in
  sepolia) RPC=https://sepolia.base.org;;
  mainnet) RPC=https://mainnet.base.org;;
  *) echo "sepolia|mainnet"; exit 1;;
esac
D="$HOME/.config/onenft/deploy-$NET.json"
NFT=$(operator_json_address "$D" OneNFT)
REN=$(operator_json_address "$D" KnotRenderer_v4)
echo "network $NET  token $NFT  renderer v3 $REN"
echo "current renderer: $(cast call "$NFT" 'renderer()(address)' --rpc-url "$RPC")"
# Probe the new renderer with today's epoch before spending gas.
EPOCH=$(( $(date -u +%s) / 86400 ))
cast call "$REN" "paletteName(uint256)(string)" "$EPOCH" --rpc-url "$RPC"
operator_signer author
cast send "$NFT" "setRenderer(address)" "$REN" "${SIGNER_ARGS[@]}" --rpc-url "$RPC" | grep -E "transactionHash|status"
echo "renderer now: $(cast call "$NFT" 'renderer()(address)' --rpc-url "$RPC")"
