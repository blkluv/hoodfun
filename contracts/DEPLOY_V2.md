# Deploy HoodFactory v2 (fixed supply + Uniswap graduation)

```bash
cd contracts
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
export PRIVATE_KEY=0xYOUR_KEY   # wallet 0x426E… needs ~0.002+ ETH on RH
export PROTOCOL=0x426E924063cD9F8B1cd659B0A55639Eaf630A17D
export GRADUATE_THRESHOLD_WEI=250000000000000000   # 0.25 ETH

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RH_RPC_URL \
  --broadcast \
  --chain 4663
```

Then set Vercel:
```
NEXT_PUBLIC_FACTORY_ADDRESS=0xNEW_FACTORY
```

Uniswap V2 Router on RH: `0x89e5DB8B5aA49aA85AC63f691524311AEB649eba`
