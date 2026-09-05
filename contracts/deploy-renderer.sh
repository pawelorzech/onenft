#!/usr/bin/env bash
# Deploys KnotRendererV3 only. Usage: contracts/deploy-renderer.sh sepolia|mainnet
# Deployer secret from Keychain. Writes KnotRenderer_v3 into ~/.config/onenft/deploy-<net>.json.
set -euo pipefail
NET="${1:?sepolia|mainnet}"
case "$NET" in
  sepolia) RPC=https://sepolia.base.org;;
  mainnet) RPC=https://mainnet.base.org;;
  *) echo "sepolia|mainnet"; exit 1;;
esac
cd "$(dirname "$0")"
PK=$(security find-generic-password -a onenft-deployer -s onenft-deployer -w)
DEPLOYER=$(cast wallet address --private-key "$PK")
echo "network $NET  deployer $DEPLOYER  balance $(cast balance "$DEPLOYER" --rpc-url "$RPC" --ether) ETH"
forge script script/DeployRenderer.s.sol --rpc-url "$RPC" --broadcast --private-key "$PK" \
  --verify --verifier sourcify 2>&1 | tee "/tmp/onenft-renderer-$NET.log" | grep -E "KnotRendererV3|verif|Error" || true
unset PK
REN=$(grep -E "^\s*KnotRendererV3 " "/tmp/onenft-renderer-$NET.log" | awk '{print $2}')
[ -n "$REN" ] || { echo "no address in the log"; exit 1; }
D="$HOME/.config/onenft/deploy-$NET.json"
python3 -c "import json;d=json.load(open('$D'));d['KnotRenderer_v3']='$REN';json.dump(d,open('$D','w'))"
echo "KnotRendererV3 $REN saved to $D"
