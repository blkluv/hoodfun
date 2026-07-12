# HoodMemes

**https://hoodmemes.fun** — Pump.fun-style memecoin **board + launchpad** for **Robinhood Chain** (chain ID `4663`).

Repo: [danyalsad/hoodfun](https://github.com/danyalsad/hoodfun)

## Why this exists

- Robinhood Chain meme meta is live (CASHCAT etc.)
- NOXA paused **new token generation** due to spam
- Competitors like hoodpump are nearly empty — we fill the board by indexing **existing Uniswap pairs** via DexScreener, then add native bonding-curve launches

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

## Domain

| | |
|--|--|
| **Primary** | [hoodmemes.fun](https://hoodmemes.fun) |
| Registrar | Namecheap |
| Deploy | Vercel (recommended) |

### Namecheap → Vercel DNS

1. Deploy this repo to Vercel
2. Project → Settings → Domains → add `hoodmemes.fun` and `www.hoodmemes.fun`
3. In Namecheap → Domain List → Manage → Advanced DNS:

| Type | Host | Value |
|------|------|--------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

(Or use the exact records Vercel shows — they win if different.)

## Disclaimer

Not affiliated with Robinhood Markets, Inc. Not financial advice.
