#!/usr/bin/env bash
# Switches the token contract to KnotRendererV4 from the author wallet (the owner).
# Usage: contracts/set-renderer.sh sepolia|mainnet
# The author secret comes from 1Password for the duration of one transaction.
set -euo pipefail
NET="${1:?sepolia|mainnet}"
case "$NET" in
  sepolia) RPC=https://sepolia.base.org;;
  mainnet) RPC=https://mainnet.base.org;;
  *) echo "sepolia|mainnet"; exit 1;;
esac
D="$HOME/.config/onenft/deploy-$NET.json"
NFT=$(python3 -c "import json;print(json.load(open('$D'))['OneNFT'])")
REN=$(python3 -c "import json;print(json.load(open('$D'))['KnotRenderer_v4'])")
echo "network $NET  token $NFT  renderer v3 $REN"
echo "current renderer: $(cast call "$NFT" 'renderer()(address)' --rpc-url "$RPC")"
# Probe the new renderer with today's epoch before spending gas.
EPOCH=$(( $(date -u +%s) / 86400 ))
cast call "$REN" "paletteName(uint256)(string)" "$EPOCH" --rpc-url "$RPC"
PK=$(op item get "onenft.click — portfel autora (Base)" --vault Private --fields label="${AUTHOR_KEY_FIELD:-private key}" --reveal)
cast send "$NFT" "setRenderer(address)" "$REN" --private-key "$PK" --rpc-url "$RPC" | grep -E "transactionHash|status"
unset PK
echo "renderer now: $(cast call "$NFT" 'renderer()(address)' --rpc-url "$RPC")"
