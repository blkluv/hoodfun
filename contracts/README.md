# HoodMemes contracts (Robinhood Chain)

Site: https://hoodmemes.fun

Target: **Robinhood Chain** — chain ID `4663`, RPC `https://rpc.mainnet.chain.robinhood.com`.

## Features

| Feature | Implementation |
|--------|----------------|
| Creator buy supply | `createToken` value above `createFee` buys on curve for creator |
| Manual burn | `HoodToken.burn` / `BondingMarket.burnTokens` |
| Token burn on buy | `tokenBurnOnBuyBps` — % of purchased tokens never minted |
| Fee → creator | `feeCreatorBps` of trade fee |
| Fee → protocol | `feeProtocolBps` |
| Fee → buyback & burn | `feeBuybackBurnBps` — fee ETH buys tokens off curve, destroyed |
| Anti-spam create fee | `createFee` (default 0.0005 ETH) |
| Bonding curve | constant product virtual reserves |

Fee split rule: `feeCreatorBps + feeProtocolBps + feeBuybackBurnBps == 10000`.

## Test

```bash
forge test -vv
```

## Deploy (mainnet RH)

```bash
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
export PRIVATE_KEY=0x...
export PROTOCOL=0xYourTreasury   # receives create fees + protocol fee share
export CREATE_FEE_WEI=500000000000000   # 0.0005 ETH

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RH_RPC_URL \
  --broadcast \
  --chain 4663
```

Copy printed `HoodFactory` address into Vercel:

```
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
```

## Contracts

- `HoodToken.sol` — ERC-20 mint/burn
- `BondingMarket.sol` — curve + fees
- `HoodFactory.sol` — launches
