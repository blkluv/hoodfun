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
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
  info?: { imageUrl?: string };
}

function toNum(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pairToToken(p: DsPair): TokenCardData {
  const buys = p.txns?.h24?.buys ?? 0;
  const sells = p.txns?.h24?.sells ?? 0;
  return {
    address: p.baseToken.address,
    name: p.baseToken.name,
    symbol: p.baseToken.symbol,
    pairAddress: p.pairAddress,
    priceUsd: toNum(p.priceUsd),
    marketCap: toNum(p.marketCap ?? p.fdv),
    volume24h: toNum(p.volume?.h24),
    priceChange24h: toNum(p.priceChange?.h24),
    liquidity: toNum(p.liquidity?.usd),
    imageUrl: p.info?.imageUrl ?? null,
    dexscreenerUrl: p.url ?? null,
    createdAt: p.pairCreatedAt ?? null,
    source: "dex",
    isNative: false,
    txns24h: buys + sells || null,
  };
}

async function searchQuery(q: string): Promise<DsPair[]> {
  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    next: { revalidate: 30 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { pairs?: DsPair[] | null };
  return (data.pairs ?? []).filter((p) => p.chainId === DEXSCREENER_CHAIN);
}

/** Fetch + dedupe RH tokens. Keeps the highest-liquidity pair per token. */
export async function fetchRobinhoodTokens(
  extraQueries: string[] = []
): Promise<TokenCardData[]> {
  const queries = [...new Set([...DISCOVERY_QUERIES, ...extraQueries])];
  const batches = await Promise.all(queries.map((q) => searchQuery(q)));
  const best = new Map<string, TokenCardData>();

  for (const pairs of batches) {
    for (const p of pairs) {
      // skip pure WETH/stable pairs as base
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

  return [...best.values()].sort(
    (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)
  );
}

export async function fetchTokenByAddress(
  address: string
): Promise<TokenCardData | null> {
  const url = `https://api.dexscreener.com/tokens/v1/${DEXSCREENER_CHAIN}/${address}`;
  const res = await fetch(url, {
    next: { revalidate: 15 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const pairs = (await res.json()) as DsPair[];
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  const rh = pairs.filter((p) => p.chainId === DEXSCREENER_CHAIN);
  if (rh.length === 0) return null;
  rh.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  return pairToToken(rh[0]);
}
