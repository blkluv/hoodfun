# HoodMemes

**https://hoodmemes.fun** — Pump-style memecoin board + launchpad for **Robinhood Chain** (`4663`).

Repo: [danyalsad/hoodfun](https://github.com/danyalsad/hoodfun)

## What stands out

1. **Creator buy** — launch with ETH to buy your own supply on the curve (not just “hope”)
2. **Fees & burns (industry presets)**  
   - Trade fee on buy/sell  
   - Split: **creator** / **protocol** / **buyback & burn**  
   - **Token burn on buy** (% of purchased supply destroyed)  
   - **Manual burn** for any holder
3. **Quick wallet** — browser keypair, deposit address, one-click trades **without MetaMask popups**

Plus a live board of existing RH memes via DexScreener so the site isn’t empty.

## Stack

- Next.js 16 + Tailwind + viem  
- Foundry contracts: `HoodFactory` · `BondingMarket` · `HoodToken`

## Dev

```bash
npm install
npm run dev
```

```bash
cd contracts && forge test -vv
```

## Deploy factory (unlocks launch + curve trade)

```bash
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
export PRIVATE_KEY=0x...
export PROTOCOL=0xYourTreasury
forge script contracts/script/Deploy.s.sol:Deploy --rpc-url $RH_RPC_URL --broadcast --chain 4663
```

Vercel env:

```
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com
```

See `contracts/README.md` and `.env.example`.

## Disclaimer

Not affiliated with Robinhood Markets, Inc. Not financial advice. Quick wallet keys live in the browser only — export if you fund them.
