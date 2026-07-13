# Deploy HoodInstantFactory (NOXA-style)

Instant Uniswap V2 launch: fixed supply + LP in one tx.

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

## Vercel

```
NEXT_PUBLIC_FACTORY_ADDRESS=0xNEW_INSTANT_FACTORY
NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com
```

Redeploy the site.

## Flow for users

1. Pick supply (1B / 5B / 10B / 100B / 1T)
2. Pick LP ETH (e.g. 0.05)
3. Toggle burn LP vs keep LP
4. One tx → Uniswap pair live → DexScreener can index

## Addresses

- Uniswap V2 Router (RH): `0x89e5DB8B5aA49aA85AC63f691524311AEB649eba`
- WETH (RH): `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`
