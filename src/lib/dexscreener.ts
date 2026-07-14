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
  liquidity?: { usd?: number; base?: number; quote?: number };
  priceNative?: string;
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
  volume5m?: number | null;
  volume24h: number | null;
  priceChange1h: number | null;
  priceChange5m: number | null;
  txns24h: number | null;
  buys24h?: number | null;
  sells24h?: number | null;
  buys5m?: number | null;
  sells5m?: number | null;
  liquidity: number | null;
  createdAt?: number | null;
  isNative?: boolean;
}): number {
  const v1 = t.volume1h ?? 0;
  const v5 = t.volume5m ?? 0;
  const v24 = t.volume24h ?? 0;
  const c1 = Math.abs(t.priceChange1h ?? 0);
  const c5 = Math.abs(t.priceChange5m ?? 0);
  const tx = t.txns24h ?? 0;
  const liq = Math.log10(Math.max(t.liquidity ?? 1, 1));

  // Buy pressure (5m preferred, else 24h)
  const b5 = t.buys5m ?? 0;
  const s5 = t.sells5m ?? 0;
  const b24 = t.buys24h ?? 0;
  const s24 = t.sells24h ?? 0;
  const buys = b5 + s5 > 0 ? b5 : b24;
  const sells = b5 + s5 > 0 ? s5 : s24;
  const total = buys + sells;
  const buyRatio = total > 0 ? buys / total : 0.5;
  const pressure = (buyRatio - 0.5) * 4000;

  // Recency boost — new pairs surface hard in the first day
  let recency = 0;
  if (t.createdAt) {
    const ageH = (Date.now() - t.createdAt) / 3_600_000;
    if (ageH < 0.5) recency = 8000;
    else if (ageH < 2) recency = 4500;
    else if (ageH < 6) recency = 2200;
    else if (ageH < 24) recency = 900;
    else if (ageH < 72) recency = 300;
  }

  const hoodBoost = t.isNative ? 1200 : 0;

  // Weight recent activity hard (trenches heat)
  return (
    v5 * 14 +
    v1 * 4 +
    v24 * 0.12 +
    c1 * 700 +
    c5 * 2800 +
    tx * 45 +
    liq * 420 +
    pressure +
    recency +
    hoodBoost
  );
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

  const buys1h = p.txns?.h1?.buys ?? 0;
  const sells1h = p.txns?.h1?.sells ?? 0;
  const buys5m = p.txns?.m5?.buys ?? 0;
  const sells5m = p.txns?.m5?.sells ?? 0;
  const volume5m = toNum(p.volume?.m5);
  const createdAt = p.pairCreatedAt ?? null;

  const base = {
    address: p.baseToken.address,
    name: p.baseToken.name,
    symbol: p.baseToken.symbol,
    pairAddress: p.pairAddress,
    priceUsd: toNum(p.priceUsd),
    priceNative: toNum(p.priceNative),
    marketCap: toNum(p.marketCap ?? p.fdv),
    fdv: toNum(p.fdv),
    volume24h,
    volume1h,
    volume6h: toNum(p.volume?.h6),
    volume5m,
    priceChange5m,
    priceChange1h,
    priceChange6h: toNum(p.priceChange?.h6),
    priceChange24h: toNum(p.priceChange?.h24),
    liquidity,
    liquidityBase: toNum(p.liquidity?.base),
    liquidityQuote: toNum(p.liquidity?.quote),
    imageUrl: p.info?.imageUrl ?? null,
    dexscreenerUrl: p.url ?? null,
    createdAt,
    source: "dex" as const,
    isNative: false,
    txns24h,
    buys24h: buys || null,
    sells24h: sells || null,
    buys1h: buys1h || null,
    sells1h: sells1h || null,
    buys5m: buys5m || null,
    sells5m: sells5m || null,
    dexId: p.dexId ?? null,
    quoteSymbol: p.quoteToken?.symbol ?? null,
  };

  return {
    ...base,
    trendScore: trendScore({
      volume1h,
      volume5m,
      volume24h,
      priceChange1h,
      priceChange5m,
      txns24h,
      buys24h: buys || null,
      sells24h: sells || null,
      buys5m: buys5m || null,
      sells5m: sells5m || null,
      liquidity,
      createdAt,
      isNative: false,
    }),
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
