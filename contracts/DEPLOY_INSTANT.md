# Deploy HoodInstantFactory (NOXA-style)

Instant Uniswap V2 launch: fixed supply + optional creator allocation + LP in one tx.

## Deploy

```bash
cd contracts
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
export PRIVATE_KEY=0xYOUR_KEY
export PROTOCOL=0x426E924063cD9F8B1cd659B0A55639Eaf630A17D
# optional:
export CREATE_FEE_WEI=500000000000000      # 0.0005 ETH
export MIN_LP_ETH_WEI=10000000000000000    # 0.01 ETH min LP

forge script script/DeployInstant.s.sol:DeployInstant \
  --rpc-url $RH_RPC_URL \
  --broadcast \
  --chain 4663
```

## Live deployment (v2 — creator allocation)

| | |
|--|--|
| **HoodInstantFactory** | `0x1E89C3EbEa4059D8B1aefc3a2A7e97caF180Ed33` |
| ABI | `createToken(name, symbol, totalSupply, burnLp, creatorBps)` |
| Creator bps | `0` / `100` (1%) / `500` (5%) / `1000` (10%) |
| createFee | 0.0005 ETH |
| minLpEth | 0.01 ETH |
| Protocol | `0x426E924063cD9F8B1cd659B0A55639Eaf630A17D` |
| Explorer | https://robinhoodchain.blockscout.com/address/0x1E89C3EbEa4059D8B1aefc3a2A7e97caF180Ed33 |

### Legacy (v1 — no creatorBps)

| | |
|--|--|
| Address | `0x2C8D3F42e440068C032eAa8d9695c98e7d642820` |
| Note | Do not use for new launches |

## Vercel

```
NEXT_PUBLIC_FACTORY_ADDRESS=0x1E89C3EbEa4059D8B1aefc3a2A7e97caF180Ed33
NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com
```

Redeploy the site after updating env.

## Flow for users

1. Pick supply (1B / 5B / 10B / 100B / 1T)
2. Pick creator allocation (0% / 1% / 5% / 10%)
3. Pick LP ETH (e.g. 0.05)
4. Toggle burn LP vs keep LP
5. One tx → Uniswap pair live → DexScreener can index

## Addresses

- Uniswap V2 Router (RH): `0x89e5DB8B5aA49aA85AC63f691524311AEB649eba`
- WETH (RH): `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`
