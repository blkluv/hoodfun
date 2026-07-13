#!/usr/bin/env bash
# Airdrop fixed ERC-20 amount to addresses in a CSV.
#
# Usage:
#   export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
#   export PRIVATE_KEY=0x...
#   export TOKEN=0xA7766b509402F5f318722293C602BaDde9530A2e
#   export AMOUNT_HUMAN=10000
#   export CSV=./scripts/holders.csv
#
#   ./scripts/airdrop-erc20.sh dry
#   ./scripts/airdrop-erc20.sh send
#
# CSV: one 0x address per line, or address,note
# Optional: START_FROM=1 MAX_SENDS=50 SLEEP_SEC=0.2 DECIMALS=18
#
set -euo pipefail

MODE="${1:-dry}"
RPC="${RH_RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
TOKEN="${TOKEN:-}"
CSV="${CSV:-./holders.csv}"
AMOUNT_HUMAN="${AMOUNT_HUMAN:-10000}"
DECIMALS="${DECIMALS:-18}"
CHAIN_ID="${CHAIN_ID:-4663}"
SLEEP_SEC="${SLEEP_SEC:-0.15}"
START_FROM="${START_FROM:-1}"
MAX_SENDS="${MAX_SENDS:-0}"

if [[ -z "${PRIVATE_KEY:-}" && "$MODE" == "send" ]]; then
  echo "ERROR: set PRIVATE_KEY for send mode"
  exit 1
fi
if [[ -z "$TOKEN" ]]; then
  echo "ERROR: set TOKEN=0x..."
  exit 1
fi
if [[ ! -f "$CSV" ]]; then
  echo "ERROR: CSV not found: $CSV"
  exit 1
fi
if ! command -v cast >/dev/null; then
  echo "ERROR: cast (foundry) required"
  exit 1
fi

AMOUNT_WEI=$(python3 -c "print(int(float('$AMOUNT_HUMAN')) * 10**int('$DECIMALS'))")

FROM=""
if [[ -n "${PRIVATE_KEY:-}" ]]; then
  FROM=$(cast wallet address --private-key "$PRIVATE_KEY")
fi

LIST=$(mktemp)
trap 'rm -f "$LIST"' EXIT

python3 - "$CSV" "$START_FROM" "$MAX_SENDS" >"$LIST" <<'PY'
import re, sys
path, start, max_s = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
seen = set()
out = []
pat = re.compile(r"^(0x[a-fA-F0-9]{40})")
skip = {
    "0x0000000000000000000000000000000000000000",
    "0x000000000000000000000000000000000000dead",
}
with open(path) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        part = line.split(",")[0].strip().strip('"').strip("'")
        m = pat.match(part)
        if not m:
            continue
        raw, low = m.group(1), m.group(1).lower()
        if low in seen or low in skip:
            continue
        seen.add(low)
        out.append(raw)
out = out[start - 1 :]
if max_s > 0:
    out = out[:max_s]
for a in out:
    print(a)
PY

N=$(wc -l <"$LIST" | tr -d ' ')
if [[ "$N" -eq 0 ]]; then
  echo "ERROR: no valid addresses in $CSV"
  exit 1
fi

echo "=== Airdrop config ==="
echo "mode:       $MODE"
echo "rpc:        $RPC"
echo "chain:      $CHAIN_ID"
echo "token:      $TOKEN"
echo "from:       ${FROM:-"(dry — set PRIVATE_KEY to check balances)"}"
echo "amount:     $AMOUNT_HUMAN tokens ($AMOUNT_WEI wei)"
echo "csv:        $CSV"
echo "recipients: $N"
echo ""

if [[ -n "$FROM" ]]; then
  BAL=$(cast call "$TOKEN" "balanceOf(address)(uint256)" "$FROM" --rpc-url "$RPC" | awk '{print $1}')
  ETH=$(cast balance "$FROM" --rpc-url "$RPC")
  SYM=$(cast call "$TOKEN" "symbol()(string)" --rpc-url "$RPC" 2>/dev/null || echo TOKEN)
  NEED=$(python3 -c "print(int('$AMOUNT_WEI') * int('$N'))")
  echo "wallet $SYM balance: $BAL"
  echo "wallet ETH:          $ETH wei"
  echo "tokens needed:       $NEED"
  python3 -c "b=int('$BAL'); n=int('$NEED'); print('token balance OK' if b>=n else f'WARNING: short by {n-b}')"
  echo ""
fi

FIRST=$(head -1 "$LIST")
GP=$(cast gas-price --rpc-url "$RPC")
if [[ -n "$FROM" ]]; then
  GAS_PER=$(cast estimate "$TOKEN" "transfer(address,uint256)" "$FIRST" "$AMOUNT_WEI" \
    --from "$FROM" --rpc-url "$RPC" 2>/dev/null || echo 65000)
else
  GAS_PER=52000
fi

python3 -c "
gp=int('$GP'); g=int(str('$GAS_PER').split()[0]); n=int('$N')
cost=gp*g*n
print(f'est gas/tx:     {g}')
print(f'gas price:      {gp/1e9:.4f} gwei')
usd=cost/1e18*2500
print(f'est total gas:  {cost/1e18:.6f} ETH  (~USD {usd:.2f} @ 2500/ETH)')
"
echo ""

if [[ "$MODE" == "dry" ]]; then
  echo "=== DRY RUN sample (first 10) ==="
  i=0
  while IFS= read -r a; do
    i=$((i + 1))
    echo "  $i  $a  +$AMOUNT_HUMAN"
    [[ $i -ge 10 ]] && break
  done <"$LIST"
  echo ""
  echo "Dry run only. Test 3 wallets first:"
  echo "  MAX_SENDS=3 ./scripts/airdrop-erc20.sh send"
  echo "Full send:"
  echo "  ./scripts/airdrop-erc20.sh send"
  exit 0
fi

if [[ "$MODE" != "send" ]]; then
  echo "Usage: $0 dry|send"
  exit 1
fi

echo "=== SENDING in 3s — Ctrl+C to abort ==="
sleep 3

OK=0
FAIL=0
i=0
LOG="${CSV%.csv}.airdrop-log.txt"
echo "# airdrop $(date -u +%Y-%m-%dT%H:%M:%SZ) token=$TOKEN amount=$AMOUNT_HUMAN" >>"$LOG"

while IFS= read -r a; do
  i=$((i + 1))
  echo -n "[$i/$N] $a ... "
  if OUT=$(cast send "$TOKEN" "transfer(address,uint256)" "$a" "$AMOUNT_WEI" \
      --private-key "$PRIVATE_KEY" \
      --rpc-url "$RPC" \
      --chain "$CHAIN_ID" \
      2>&1); then
    HASH=$(echo "$OUT" | grep -i "transactionHash" | head -1 | awk '{print $2}')
    echo "ok ${HASH:-sent}"
    echo "OK $a ${HASH:-}" >>"$LOG"
    OK=$((OK + 1))
  else
    echo "FAIL"
    echo "FAIL $a" >>"$LOG"
    echo "$OUT" | tail -5
    FAIL=$((FAIL + 1))
  fi
  sleep "$SLEEP_SEC"
done <"$LIST"

echo ""
echo "=== Done OK=$OK FAIL=$FAIL log=$LOG ==="
