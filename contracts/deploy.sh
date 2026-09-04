#!/usr/bin/env bash
# Wdrożenie OneNFT. Użycie: contracts/deploy.sh sepolia|mainnet
# Klucz deployera z Keychaina, adres autora z ~/.config/onenft/author.json.
set -euo pipefail
NET="${1:?sepolia|mainnet}"
case "$NET" in
  sepolia) RPC=https://sepolia.base.org; CHAIN=84532;;
  mainnet) RPC=https://mainnet.base.org; CHAIN=8453;;
  *) echo "sepolia|mainnet"; exit 1;;
esac
cd "$(dirname "$0")"
AUTHOR=$(python3 -c "import json;print(json.load(open('$HOME/.config/onenft/author.json'))['address'])")
PK=$(security find-generic-password -a onenft-deployer -s onenft-deployer -w)
DEPLOYER=$(cast wallet address --private-key "$PK")
BAL=$(cast balance "$DEPLOYER" --rpc-url "$RPC" --ether)
echo "network $NET  deployer $DEPLOYER  balance $BAL ETH  author $AUTHOR"
if [ -z "${START_EPOCH:-}" ]; then
  if [ "$NET" = mainnet ]; then START_EPOCH=1178; else START_EPOCH=$(( $(cast block-number --rpc-url "$RPC") / 43200 )); fi
fi
echo "START_EPOCH=$START_EPOCH"
START_EPOCH=$START_EPOCH AUTHOR=$AUTHOR forge script script/Deploy.s.sol --rpc-url "$RPC" --broadcast --private-key "$PK" \
  --verify --verifier sourcify 2>&1 | tee "/tmp/onenft-deploy-$NET.log" | grep -E "KnotRenderer|OneNFT|startEpoch|verif|Error" || true
unset PK
NFT=$(grep -E "^\s*OneNFT " "/tmp/onenft-deploy-$NET.log" | awk '{print $2}'); REN=$(grep -E "^\s*KnotRenderer " "/tmp/onenft-deploy-$NET.log" | awk '{print $2}')
mkdir -p "$HOME/.config/onenft"
printf '{"network":"%s","chainId":%s,"OneNFT":"%s","KnotRenderer":"%s","startEpoch":%s,"author":"%s","deployer":"%s","at":"%s"}\n' \
  "$NET" "$CHAIN" "$NFT" "$REN" "$START_EPOCH" "$AUTHOR" "$DEPLOYER" "$(date -u +%FT%TZ)" > "$HOME/.config/onenft/deploy-$NET.json"
echo "saved: ~/.config/onenft/deploy-$NET.json"
