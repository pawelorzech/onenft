#!/usr/bin/env bash
# Deploys KnotRendererV4 only. Usage: contracts/deploy-renderer.sh sepolia|mainnet
# Deployer uses an encrypted Foundry keystore. Writes KnotRenderer_v4 into ~/.config/onenft/deploy-<net>.json.
set -euo pipefail
source "$(dirname "$0")/../scripts/operator-safe.sh"
NET="${1:?sepolia|mainnet}"
case "$NET" in
  sepolia) RPC=https://sepolia.base.org;;
  mainnet) RPC=https://mainnet.base.org;;
  *) echo "sepolia|mainnet"; exit 1;;
esac
cd "$(dirname "$0")"
operator_signer deployer
DEPLOYER=$(operator_address "$(cast wallet address "${SIGNER_ARGS[@]}")")
echo "network $NET  deployer $DEPLOYER  balance $(cast balance "$DEPLOYER" --rpc-url "$RPC" --ether) ETH"
forge script script/DeployRenderer.s.sol --rpc-url "$RPC" --broadcast "${SIGNER_ARGS[@]}" \
  --verify --verifier sourcify 2>&1 | tee "$OPERATOR_TMP_DIR/onenft-renderer4-$NET.log"
REN=$(operator_log_address "$OPERATOR_TMP_DIR/onenft-renderer4-$NET.log" KnotRendererV4)
[ -n "$REN" ] || { echo "no address in the log"; exit 1; }
D="$HOME/.config/onenft/deploy-$NET.json"
bun "$OPERATOR_TOOL" set-address "$D" KnotRenderer_v4 "$REN"
echo "KnotRendererV4 $REN saved to $D"
