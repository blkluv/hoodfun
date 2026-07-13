#!/usr/bin/env bash
# Remove 100% HOODMEMES V2 LP → reclaim all ETH from the pool.
# Usage:
#   export PRIVATE_KEY=0x...
#   ./scripts/remove-v2-lp.sh
set -euo pipefail

RPC="${RH_RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
TOKEN="${TOKEN:-0xA7766b509402F5f318722293C602BaDde9530A2e}"
PAIR="${PAIR:-0x63E09D735a49733Bf6BdEcff84C33d23A1366492}"
ROUTER="${ROUTER:-0x89e5DB8B5aA49aA85AC63f691524311AEB649eba}"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "ERROR: set PRIVATE_KEY for the wallet that holds the LP"
  echo "  export PRIVATE_KEY=0x..."
  exit 1
fi

WALLET=$(cast wallet address --private-key "$PRIVATE_KEY")
echo "Wallet: $WALLET"
echo "Pair:   $PAIR"
echo "Router: $ROUTER"

LP=$(cast call "$PAIR" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC")
# cast may print "123 [1.23e2]" — take first field
LP=$(echo "$LP" | awk '{print $1}')
echo "LP balance: $LP"

if [[ "$LP" == "0" ]]; then
  echo "No LP tokens — nothing to remove."
  exit 0
fi

ETH_BEFORE=$(cast balance "$WALLET" --rpc-url "$RPC")
echo "ETH before: $ETH_BEFORE"

echo "1) Approve router for LP..."
cast send "$PAIR" "approve(address,uint256)" "$ROUTER" "$LP" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC" --legacy

DEADLINE=$(($(date +%s) + 1800))
echo "2) removeLiquidityETH (all LP)..."
cast send "$ROUTER" \
  "removeLiquidityETH(address,uint256,uint256,uint256,address,uint256)" \
  "$TOKEN" "$LP" 0 0 "$WALLET" "$DEADLINE" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC" --legacy

ETH_AFTER=$(cast balance "$WALLET" --rpc-url "$RPC")
LP_AFTER=$(cast call "$PAIR" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC" | awk '{print $1}')
WETH_PAIR=$(cast call 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 \
  "balanceOf(address)(uint256)" "$PAIR" --rpc-url "$RPC" | awk '{print $1}')

echo ""
echo "=== DONE ==="
echo "ETH after:  $ETH_AFTER"
echo "LP left:    $LP_AFTER"
echo "WETH left in pair: $WETH_PAIR"
echo "You also received HOODMEMES tokens (scrap without a market)."
