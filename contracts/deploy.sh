#!/usr/bin/env bash
# Deploys OneNFT. Usage: contracts/deploy.sh sepolia|mainnet
# Deployer uses an encrypted Foundry keystore, author address from ~/.config/onenft/author.json.
set -euo pipefail
source "$(dirname "$0")/../scripts/operator-safe.sh"
NET="${1:?sepolia|mainnet}"
case "$NET" in
  sepolia) RPC=https://sepolia.base.org; CHAIN=84532;;
  mainnet) RPC=https://mainnet.base.org; CHAIN=8453;;
  *) echo "sepolia|mainnet"; exit 1;;
esac
cd "$(dirname "$0")"
AUTHOR=$(operator_json_address "$HOME/.config/onenft/author.json" address)
operator_signer deployer
DEPLOYER=$(operator_address "$(cast wallet address "${SIGNER_ARGS[@]}")")
BAL=$(cast balance "$DEPLOYER" --rpc-url "$RPC" --ether)
echo "network $NET  deployer $DEPLOYER  balance $BAL ETH  author $AUTHOR"
# Day 1 is 2026-09-05 UTC on every network (the clock is block.timestamp / 86400).
START_EPOCH="${START_EPOCH:-$(( $(date -u +%s) / 86400 ))}"
[[ "$START_EPOCH" =~ ^[0-9]{1,12}$ ]] || { echo "Invalid START_EPOCH" >&2; exit 1; }
echo "START_EPOCH=$START_EPOCH"
START_EPOCH=$START_EPOCH AUTHOR=$AUTHOR forge script script/Deploy.s.sol --rpc-url "$RPC" --broadcast "${SIGNER_ARGS[@]}" \
  --verify --verifier sourcify 2>&1 | tee "$OPERATOR_TMP_DIR/onenft-deploy-$NET.log"
NFT=$(operator_log_address "$OPERATOR_TMP_DIR/onenft-deploy-$NET.log" OneNFT); REN=$(operator_log_address "$OPERATOR_TMP_DIR/onenft-deploy-$NET.log" KnotRenderer)
mkdir -p "$HOME/.config/onenft"
printf '{"network":"%s","chainId":%s,"OneNFT":"%s","KnotRenderer":"%s","startEpoch":%s,"author":"%s","deployer":"%s","at":"%s"}\n' \
  "$NET" "$CHAIN" "$NFT" "$REN" "$START_EPOCH" "$AUTHOR" "$DEPLOYER" "$(date -u +%FT%TZ)" | operator_write_json "$HOME/.config/onenft/deploy-$NET.json"
echo "saved: ~/.config/onenft/deploy-$NET.json"
