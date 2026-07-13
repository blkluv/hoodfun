# HoodMemes — Session Handoff

**Last updated:** 2026-07-13  
**Repo:** https://github.com/danyalsad/hoodfun  
**Site:** https://hoodmemes.fun (also www)  
**Owner:** danyalsad (GitHub) · local path `/Users/danny/hoodfun`  
**Domain:** Namecheap · `hoodmemes.fun`

This file is for a **new agent session** to take over without re-discovering context.

---

## One-line pitch

Pump/NOXA-style memecoin launchpad on **Robinhood Chain** (EVM L2, chain ID **4663**): browse RH memes, launch tokens, trade. Brand: **HoodMemes**.

---

## Current product direction (IMPORTANT)

### Active target: **NOXA-style instant Uniswap launch**

User rejected long bonding-curve graduation as the main UX. Desired flow:

1. User picks **fixed supply** (1B / 5B / 10B / 100B / 1T)
2. User picks **initial LP ETH** (e.g. 0.05–0.2)
3. **One tx:** mint fixed supply → Uniswap V2 `addLiquidityETH` → optional **burn LP** or keep LP
4. Token is on **Uniswap immediately** → DexScreener can index
5. Small **create fee** to protocol; LP ETH goes into the pool

**Contract:** `contracts/src/HoodInstantFactory.sol`  
**Deploy script:** `contracts/script/DeployInstant.s.sol`  
**Docs:** `contracts/DEPLOY_INSTANT.md`  
**Tests:** `contracts/test/HoodInstantFactory.t.sol` (4/4 passing last run)

### NOT yet done (blocker for live instant launches)

- [ ] **Deploy `HoodInstantFactory` to RH mainnet**
- [ ] Set Vercel `NEXT_PUBLIC_FACTORY_ADDRESS` to the **new** instant factory
- [ ] Redeploy site

Until then, default code still points at the **old bonding-curve factory** (see addresses below). Create UI expects **instant** factory ABI (`createToken(name, symbol, totalSupply, burnLp)`).

---

## Chain & infra

| Item | Value |
|------|--------|
| Chain | Robinhood Chain |
| Chain ID | `4663` |
| RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | https://robinhoodchain.blockscout.com |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| Uniswap V2 Router | `0x89e5DB8B5aA49aA85AC63f691524311AEB649eba` |
| Uniswap V2 Factory | `0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f` |

### Deployed contracts (on RH)

| Contract | Address | Notes |
|----------|---------|--------|
| **HoodFactory v1** (bonding curve) | `0xD0F7f28C32e111C2367aB08B289d66Ab3DeFf8Eb` | Live; mint-on-buy; **no Uni** |
| **HoodInstantFactory** | **NOT DEPLOYED YET** | Code ready |

### Example v1 token (legacy beta)

User launched first token on v1 curve:

| | |
|--|--|
| Token | `0x40A33b6fdfaeed06D6F78Af2873790DA4471B567` |
| Market | `0x28c26cBBA4784E866BecD9547bC5b612DDfabECB` |
| Name/symbol | HoodMemes / HOODMEMES |
| Issue | Mint-on-buy → supply ≈ only creator bag; **no DexScreener** (no Uni pair) |

User spent ~$20 ETH learning this. Treat v1 as beta; official relaunch should use **instant factory**.

### Protocol / deployer wallet

- Protocol / fees wallet often: `0x426E924063cD9F8B1cd659B0A55639Eaf630A17D` (MetaMask account 2)
- Another account from same seed (index 0): `0x1d6293C6bf17273095c66b90E7338De1a2204cCF` (was empty during first deploy attempt)
- **Never store private keys in repo.** User exports via `cast wallet private-key --mnemonic "..."` (don't ask for seed in chat)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind 4, TypeScript, **viem** |
| Hosting | Vercel → GitHub `danyalsad/hoodfun` main |
| Contracts | Foundry, Solidity 0.8.24 |
| Admin config | Upstash Redis (REST) preferred; fallbacks: file, `SITE_CONFIG_JSON` env, GitHub raw |
| Token data (board) | DexScreener API (`chainId: robinhood`) |
| Curve data (legacy) | On-chain via `/api/curve` |
| Instant launch data | On-chain via `/api/launch` |

---

## Env vars (Vercel)

### Required / used

```bash
NEXT_PUBLIC_FACTORY_ADDRESS=0x...   # MUST become HoodInstantFactory after deploy
NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com

ADMIN_PASSWORD=...                  # /hm-ops login
ADMIN_SECRET=...                    # cookie HMAC (or falls back)
ADMIN_WALLETS=0x426E924063cD9F8B1cd659B0A55639Eaf630A17D

# Admin config persistence (live Save on Vercel)
UPSTASH_REDIS_REST_URL=https://....upstash.io   # no quotes!
UPSTASH_REDIS_REST_TOKEN=...                    # no quotes; rotate if ever leaked in chat
```

### Optional

```bash
SITE_CONFIG_JSON={...}              # emergency config dump from admin Export
GITHUB_TOKEN=...                    # admin save commits data/site-config.json
GITHUB_REPO=danyalsad/hoodfun
CREATE_FEE_WEI / MIN_LP_ETH_WEI     # deploy-time only
```

**Vercel tip:** env values must **not** include surrounding `"quotes"`. After changing env → **Redeploy**.

---

## App routes & features

| Path | Purpose |
|------|---------|
| `/` | Trending board (DexScreener multi-query), filters, marquee, featured |
| `/create` | **Instant launch UI** (supply + LP ETH + burn/keep LP) |
| `/token/[address]` | Token page: instant Uni pair **or** legacy curve chart |
| `/account` | Login-gated wallet (quick wallet export) |
| `/wallet` | Redirects → `/account` |
| `/hm-ops` | Secret admin (noindex); featured tokens, banners, kill switches |

### Auth

- **MetaMask / injected** or **quick wallet** (localStorage keypair, no popup per tx)
- Login gate on launch/trade (admin-configurable)
- Quick wallet is **not** shown publicly until login

### Admin (`/hm-ops`)

- Password (+ optional wallet allowlist)
- Featured tokens, announcement, maintenance, hide tokens, social links
- Persistence: Upstash first (working after quote strip + redeploy)
- Diagnose panel: `/api/admin/diagnose`

### Branding

- Logo / favicon: HM green tile (`public/logo.png`, `public/og.png` 1200×630)
- Desktop copies were saved under `~/Desktop/HoodMemes-*`
- OG/Twitter: `summary_large_image`, dynamic token OG at `token/[address]/opengraph-image.tsx`

---

## Contracts map

| File | Role |
|------|------|
| `HoodInstantFactory.sol` | **Primary** — instant Uni launch |
| `HoodToken.sol` | Fixed max supply, mint once to launcher |
| `IUniswapV2.sol` | Router/factory/pair interfaces |
| `HoodFactory.sol` + `BondingMarket.sol` | **Legacy** curve + graduate path (still in repo) |
| `DeployInstant.s.sol` | Deploy instant factory |
| `Deploy.s.sol` | Deploy old curve factory |

### Instant launch economics

| Flow | Destination |
|------|-------------|
| `createFee` | `protocol` wallet |
| LP ETH (`msg.value - createFee`) | Uniswap V2 TOKEN/WETH pool |
| 100% token supply | Into LP |
| LP tokens | `0xdead` if `burnLp=true`, else creator |

---

## Frontend key files

| File | Notes |
|------|--------|
| `src/lib/abis.ts` | **Instant factory ABI** is default `factoryAbi` |
| `src/lib/contracts.ts` | `FACTORY_ADDRESS` env + fallback old v1 address |
| `src/lib/curve.ts` | Legacy curve; uses **separate** `legacyFactoryAbi` for `marketOfToken` (TS fix) |
| `src/lib/dexscreener.ts` | Board token aggregation |
| `src/lib/sessionWallet.ts` / `wallet-tx.ts` | Quick + injected wallets |
| `src/components/CreateForm.tsx` | Instant launch form |
| `src/components/TokenPageClient.tsx` | Instant vs curve vs dex |
| `src/components/TokenBoard.tsx` | Homepage board UI |
| `src/app/api/launch/route.ts` | Instant launch lookup |
| `src/app/api/curve/route.ts` | Curve snapshot |
| `src/app/api/tokens/route.ts` | Board API |
| `src/app/api/admin/*` | Admin auth + config |

---

## Known issues & lessons

1. **DexScreener needs a Uniswap (or other DEX) pair** — bonding curve alone will never list.
2. **v1 mint-on-buy** = “unlimited” feeling supply; Blockscout total = only minted. User hated this → fixed supply for instant/v2.
3. **Vercel FS is read-only** — admin Save needs Upstash (or env JSON / GitHub).
4. **Vercel env quotes** break Upstash URL/token — strip quotes in code (`config-store.ts` `env()` helper).
5. **Never put PRIVATE_KEY in Vercel frontend env.**
6. **TypeScript:** don’t call `marketOfToken` on instant `factoryAbi`; use `legacyFactoryAbi` or `pairOfToken`.
7. **Vercel deploy lag:** always check deploy commit SHA matches latest main (user hit `f646864` after fix was on `5147925`).
8. **Pipeline trap:** `npm run build | tail` returns tail’s exit code — can mask build failures before git push.

---

## User preferences / product opinions

- Wants **NOXA-like** instant Uni, not Pump-style long curve wait.
- Community-funded 0.25 ETH graduation felt pointless / no creator profit.
- LP burn should be **optional** (burn vs keep) — already in instant factory.
- Official token brand: **HoodMemes / HOODMEMES**; may relaunch after instant factory is live.
- Domain brand: **hoodmemes.fun** (not hoodfun.io).

---

## Immediate next steps (priority order)

1. **Deploy `HoodInstantFactory`** (user has low ETH sometimes — needs ~0.01+ on RH for gas).
2. **Point Vercel** `NEXT_PUBLIC_FACTORY_ADDRESS` at new factory → redeploy.
3. Smoke test: launch 1B token with 0.05 ETH LP, burn LP, confirm pair on explorer + DexScreener.
4. Optional: hardcode new factory in `src/lib/contracts.ts` fallback.
5. Optional: list recent instant launches on homepage (not only DexScreener scrape).
6. Optional: deprecate UI paths for bonding-curve create (legacy still works if factory is old address).
7. Official `$HOODMEMES` relaunch announcement once instant is live.

### Deploy commands (copy-paste)

```bash
cd /Users/danny/hoodfun/contracts
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
export PRIVATE_KEY=0x...
export PROTOCOL=0x426E924063cD9F8B1cd659B0A55639Eaf630A17D
forge script script/DeployInstant.s.sol:DeployInstant \
  --rpc-url $RH_RPC_URL --broadcast --chain 4663
```

Then Vercel env + redeploy.

---

## Local dev

```bash
cd /Users/danny/hoodfun
npm install
npm run dev
# contracts
cd contracts && forge test -vv
```

---

## Admin quick ref

- URL: https://hoodmemes.fun/hm-ops  
- Default password was `hoodmemes-admin` if unset (should be changed on Vercel).  
- Featured tokens drive homepage “Featured” row.

---

## What success looks like for the user

> “I open /create, pick 1B supply, put 0.05 ETH LP, burn LP, one MetaMask/quick-wallet confirm → token + Uni pair exist → DexScreener finds it → I can relaunch official HOODMEMES without unlimited supply or waiting on a curve.”

Until InstantFactory is **deployed and wired**, create may fail or hit wrong ABI/address.

---

## Related docs in repo

- `README.md` — public overview  
- `contracts/DEPLOY_INSTANT.md` — instant deploy  
- `contracts/DEPLOY_V2.md` — older curve+graduate deploy (superseded as primary path)  
- `contracts/README.md` — general contracts notes  
- `.env.example` — env template  

---

*End of handoff. On new session: read this file first, then check whether `HoodInstantFactory` is deployed and whether `NEXT_PUBLIC_FACTORY_ADDRESS` matches it.*
