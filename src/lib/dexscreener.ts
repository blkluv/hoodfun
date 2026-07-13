import { DEXSCREENER_CHAIN, DISCOVERY_QUERIES } from "./chain";
import type { TokenCardData } from "./types";

interface DsPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  priceChange?: { h24?: number; h6?: number; h1?: number; m5?: number };
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
  txns?: {
    h24?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    m5?: { buys?: number; sells?: number };
  };
  info?: { imageUrl?: string };
}

function toNum(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function trendScore(t: {
  volume1h: number | null;
  volume24h: number | null;
  priceChange1h: number | null;
  priceChange5m: number | null;
  txns24h: number | null;
  liquidity: number | null;
}): number {
  const v1 = t.volume1h ?? 0;
  const v24 = t.volume24h ?? 0;
  const c1 = Math.abs(t.priceChange1h ?? 0);
  const c5 = Math.abs(t.priceChange5m ?? 0);
  const tx = t.txns24h ?? 0;
  const liq = Math.log10(Math.max(t.liquidity ?? 1, 1));
  // Weight recent activity hard (NOXA-style trenches heat)
  return v1 * 3 + v24 * 0.15 + c1 * 800 + c5 * 2000 + tx * 40 + liq * 500;
}

function pairToToken(p: DsPair): TokenCardData {
  const buys = p.txns?.h24?.buys ?? 0;
  const sells = p.txns?.h24?.sells ?? 0;
  const volume1h = toNum(p.volume?.h1);
  const volume24h = toNum(p.volume?.h24);
  const priceChange1h = toNum(p.priceChange?.h1);
  const priceChange5m = toNum(p.priceChange?.m5);
  const liquidity = toNum(p.liquidity?.usd);
  const txns24h = buys + sells || null;

  const partial = {
    volume1h,
    volume24h,
    priceChange1h,
    priceChange5m,
    txns24h,
    liquidity,
  };

  return {
    address: p.baseToken.address,
    name: p.baseToken.name,
    symbol: p.baseToken.symbol,
    pairAddress: p.pairAddress,
    priceUsd: toNum(p.priceUsd),
    marketCap: toNum(p.marketCap ?? p.fdv),
    volume24h,
    volume1h,
    volume6h: toNum(p.volume?.h6),
    priceChange5m,
    priceChange1h,
    priceChange6h: toNum(p.priceChange?.h6),
    priceChange24h: toNum(p.priceChange?.h24),
    liquidity,
    imageUrl: p.info?.imageUrl ?? null,
    dexscreenerUrl: p.url ?? null,
    createdAt: p.pairCreatedAt ?? null,
    source: "dex",
    isNative: false,
    txns24h,
    buys24h: buys || null,
    sells24h: sells || null,
    trendScore: trendScore(partial),
  };
}

async function searchQuery(q: string): Promise<DsPair[]> {
  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    next: { revalidate: 20 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { pairs?: DsPair[] | null };
  return (data.pairs ?? []).filter((p) => p.chainId === DEXSCREENER_CHAIN);
}

export async function fetchRobinhoodTokens(
  extraQueries: string[] = []
): Promise<TokenCardData[]> {
  const queries = [...new Set([...DISCOVERY_QUERIES, ...extraQueries])];
  const batches = await Promise.all(queries.map((q) => searchQuery(q)));
  const best = new Map<string, TokenCardData>();

  for (const pairs of batches) {
    for (const p of pairs) {
      const sym = p.baseToken.symbol?.toUpperCase();
      if (sym === "WETH" || sym === "ETH" || sym === "USDC" || sym === "USDT") {
        continue;
      }
      const token = pairToToken(p);
      const key = token.address.toLowerCase();
      const prev = best.get(key);
      if (!prev || (token.liquidity ?? 0) > (prev.liquidity ?? 0)) {
        best.set(key, token);
      }
    }
  }

  return [...best.values()].sort((a, b) => b.trendScore - a.trendScore);
}

function pickBestPair(pairs: DsPair[]): TokenCardData | null {
  const rh = pairs.filter(
    (p) =>
      !p.chainId ||
      p.chainId === DEXSCREENER_CHAIN ||
      p.chainId === "robinhood"
  );
  if (rh.length === 0) return null;
  rh.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  return pairToToken(rh[0]);
}

export async function fetchTokenByAddress(
  address: string
): Promise<TokenCardData | null> {
  const addr = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;

  // Primary: tokens/v1 (chain-scoped)
  try {
    const url = `https://api.dexscreener.com/tokens/v1/${DEXSCREENER_CHAIN}/${addr}`;
    const res = await fetch(url, {
      next: { revalidate: 15 },
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const pairs = (await res.json()) as DsPair[];
      if (Array.isArray(pairs) && pairs.length) {
        const t = pickBestPair(pairs);
        if (t) return t;
      }
    }
  } catch {
    /* fall through */
  }

  // Fallback: latest/dex/tokens
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${addr}`;
    const res = await fetch(url, {
      next: { revalidate: 15 },
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { pairs?: DsPair[] | null };
      if (data.pairs?.length) {
        const t = pickBestPair(data.pairs);
        if (t) return t;
      }
    }
  } catch {
    /* fall through */
  }

  return null;
}

/** Fetch by pair address (DexScreener pair page) */
export async function fetchTokenByPair(
  pairAddress: string
): Promise<TokenCardData | null> {
  const pair = pairAddress.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(pair)) return null;
  try {
    const url = `https://api.dexscreener.com/latest/dex/pairs/${DEXSCREENER_CHAIN}/${pair}`;
    const res = await fetch(url, {
      next: { revalidate: 15 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: DsPair[] | null;
      pair?: DsPair | null;
    };
    const list = data.pairs?.length
      ? data.pairs
      : data.pair
        ? [data.pair]
        : [];
    return pickBestPair(list);
  } catch {
    return null;
  }
}
