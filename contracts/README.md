# HoodFun contracts (Robinhood Chain)

Target chain: **Robinhood Chain mainnet** — chain ID `4663`, RPC `https://rpc.mainnet.chain.robinhood.com`.

## Planned modules

1. **`HoodToken`** — minimal ERC-20 (name/symbol/image metadata off-chain)
2. **`BondingCurve`** — constant-product style virtual reserves; buy/sell in ETH
3. **`Factory`** — `createToken(name, symbol, uri)` with **paid create fee** (anti-spam)
4. **`Graduation`** — on market-cap / ETH threshold, seed Uniswap V3 pool, lock/burn LP
5. **Fees** — protocol + creator split

## Why paid create

NOXA paused free mints after spam/vamps. Create fee + rate limit is non-negotiable for day-1.

## Deploy (Foundry)

```bash
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
forge init --force
# forge create ... --rpc-url $RH_RPC_URL --chain 4663
```

Contracts are intentionally not deployed until audit-lite + fee wiring is ready.
