# HoodFun

Pump.fun-style memecoin **board + launchpad** for **Robinhood Chain** (chain ID `4663`).

## Why this exists

- Robinhood Chain meme meta is live (CASHCAT etc.)
- NOXA paused **new token generation** due to spam
- `hoodpump.fun` is nearly empty — we fill the board by indexing **existing Uniswap pairs** via DexScreener, then add native bonding-curve launches

## Features (MVP)

- Live token board (multi-query DexScreener → RH chain only)
- Sort by mcap / volume / gainers / newest
- Search
- Token page with Uniswap trade link + DexScreener embed
- Create form UI (factory contracts next; anti-spam paid mint)

## Stack

- Next.js 16 (App Router) + Tailwind
- DexScreener public API (no key)
- Foundry-ready `contracts/` for RH EVM

## Dev

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

API: `GET /api/tokens` · `GET /api/tokens?q=CASHCAT` · `GET /api/tokens?address=0x…`

## Domain candidates

See conversation / buy ASAP. Working brand: **HoodFun**.

## Disclaimer

Not affiliated with Robinhood Markets, Inc. Not financial advice.
