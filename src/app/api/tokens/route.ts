import { NextRequest, NextResponse } from "next/server";
import {
  fetchRobinhoodTokens,
  fetchTokenByAddress,
  fetchTokenByPair,
} from "@/lib/dexscreener";
import { getAllLaunchMeta, getLaunchMeta } from "@/lib/launch-meta";
import type { BoardTab, SortKey, TokenCardData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 20;

function sortTokens(tokens: TokenCardData[], sort: SortKey): TokenCardData[] {
  const arr = [...tokens];
  if (sort === "createdAt") {
    arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return arr;
  }
  arr.sort((a, b) => {
    const av = (a[sort] as number | null) ?? -Infinity;
    const bv = (b[sort] as number | null) ?? -Infinity;
    return bv - av;
  });
  return arr;
}

function applyTab(tokens: TokenCardData[], tab: BoardTab): TokenCardData[] {
  const now = Date.now();
  switch (tab) {
    case "trending":
      return sortTokens(tokens, "trendScore");
    case "hot":
      // 5m / 1h heat — true momentum, not just 24h leftovers
      return [...tokens]
        .filter(
          (t) =>
            (t.volume5m ?? 0) > 0 ||
            (t.volume1h ?? 0) > 0 ||
            Math.abs(t.priceChange5m ?? 0) > 2 ||
            (t.txns24h ?? 0) > 5
        )
        .sort((a, b) => {
          const sa =
            (a.volume5m ?? 0) * 10 +
            (a.volume1h ?? 0) * 2 +
            Math.abs(a.priceChange5m ?? 0) * 50;
          const sb =
            (b.volume5m ?? 0) * 10 +
            (b.volume1h ?? 0) * 2 +
            Math.abs(b.priceChange5m ?? 0) * 50;
          return sb - sa;
        });
    case "new":
      return sortTokens(
        tokens.filter((t) => t.createdAt && now - t.createdAt < 1000 * 60 * 60 * 48),
        "createdAt"
      ).length
        ? sortTokens(
            tokens.filter(
              (t) => t.createdAt && now - t.createdAt < 1000 * 60 * 60 * 48
            ),
            "createdAt"
          )
        : sortTokens(tokens, "createdAt");
    case "hood":
      // HoodMemes launches (meta / isNative) — freshest first
      return sortTokens(
        tokens.filter((t) => t.isNative || t.source === "hoodfun"),
        "createdAt"
      );
    case "gainers":
      return sortTokens(
        tokens.filter((t) => (t.priceChange24h ?? 0) > 0),
        "priceChange24h"
      );
    case "losers":
      return [...tokens]
        .filter((t) => (t.priceChange24h ?? 0) < 0)
        .sort(
          (a, b) => (a.priceChange24h ?? 0) - (b.priceChange24h ?? 0)
        );
    case "volume":
      return sortTokens(tokens, "volume24h");
    case "mcap":
      return sortTokens(tokens, "marketCap");
    case "liquidity":
      return sortTokens(tokens, "liquidity");
    default:
      return sortTokens(tokens, "trendScore");
  }
}

function metaToCard(m: {
  token: string;
  pair?: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  createdAt: number;
}): TokenCardData {
  const ageH = (Date.now() - (m.createdAt || Date.now())) / 3_600_000;
  const recency =
    ageH < 1 ? 9000 : ageH < 6 ? 4000 : ageH < 24 ? 1500 : 400;
  return {
    address: m.token,
    name: m.name,
    symbol: m.symbol,
    pairAddress: m.pair || null,
    priceUsd: null,
    marketCap: null,
    volume24h: null,
    volume1h: null,
    volume6h: null,
    priceChange5m: null,
    priceChange1h: null,
    priceChange6h: null,
    priceChange24h: null,
    liquidity: null,
    imageUrl: m.imageUrl || `/api/logo/${m.token.toLowerCase()}`,
    dexscreenerUrl: null,
    createdAt: m.createdAt || null,
    source: "hoodfun",
    isNative: true,
    txns24h: null,
    buys24h: null,
    sells24h: null,
    trendScore: recency + 1200,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const address = searchParams.get("address");
    const pair = searchParams.get("pair");
    if (address) {
      const token =
        (await fetchTokenByAddress(address)) ||
        (pair ? await fetchTokenByPair(pair) : null);
      const meta = await getLaunchMeta(address).catch(() => null);
      if (!token && !meta) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      if (!token) {
        // Meta-only (brand new, not on Dex yet) — still return logo/name
        return NextResponse.json({
          token: {
            address,
            name: meta!.name,
            symbol: meta!.symbol,
            pairAddress: meta!.pair || pair || null,
            priceUsd: null,
            marketCap: null,
            volume24h: null,
            volume1h: null,
            volume6h: null,
            priceChange5m: null,
            priceChange1h: null,
            priceChange6h: null,
            priceChange24h: null,
            liquidity: null,
            imageUrl: meta!.imageUrl || null,
            dexscreenerUrl: null,
            createdAt: meta!.createdAt || null,
            source: "hoodfun",
            isNative: true,
            txns24h: null,
            buys24h: null,
            sells24h: null,
            trendScore: 0,
          } satisfies TokenCardData,
        });
      }
      if (meta?.imageUrl && !token.imageUrl) {
        token.imageUrl = meta.imageUrl;
      } else if (meta?.imageUrl) {
        // Prefer HoodMemes logo
        token.imageUrl = meta.imageUrl;
      }
      return NextResponse.json({ token });
    }
    if (pair) {
      const token = await fetchTokenByPair(pair);
      if (!token) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      return NextResponse.json({ token });
    }

    const q = searchParams.get("q")?.trim();
    const tab = (searchParams.get("tab") as BoardTab) || "trending";
    const sort = (searchParams.get("sort") as SortKey) || undefined;
    const minLiq = Number(searchParams.get("minLiq") ?? "0");
    const extra = q ? [q] : [];

    let tokens = await fetchRobinhoodTokens(extra);
    if (q) {
      const lower = q.toLowerCase();
      tokens = tokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(lower) ||
          t.name.toLowerCase().includes(lower) ||
          t.address.toLowerCase() === lower
      );
    }

    // Merge HoodMemes launch-meta: logos + inject not-yet-indexed launches
    try {
      const metaMap = await getAllLaunchMeta();
      const byAddr = new Map(
        tokens.map((t) => [t.address.toLowerCase(), t] as const)
      );
      for (const t of tokens) {
        const m = metaMap[t.address.toLowerCase()];
        if (m) {
          t.isNative = true;
          t.source = t.source === "dex" ? "dex" : "hoodfun";
          if (m.imageUrl) t.imageUrl = m.imageUrl;
          if (m.pair && !t.pairAddress) t.pairAddress = m.pair;
          if (m.createdAt && !t.createdAt) t.createdAt = m.createdAt;
          // re-score with native boost
          t.trendScore =
            (t.trendScore || 0) + 1200 + (m.v3 ? 400 : 0);
        }
      }
      for (const m of Object.values(metaMap)) {
        const key = m.token.toLowerCase();
        if (!byAddr.has(key) && /^0x[a-fA-F0-9]{40}$/i.test(m.token)) {
          const card = metaToCard(m);
          tokens.push(card);
          byAddr.set(key, card);
        }
      }
    } catch {
      /* optional */
    }

    if (minLiq > 0) {
      // re-apply after meta inject: keep zero-liq hood launches on hood/new tabs
      if (tab !== "hood" && tab !== "new") {
        tokens = tokens.filter(
          (t) => t.isNative || (t.liquidity ?? 0) >= minLiq
        );
      }
    }

    tokens = sort ? sortTokens(tokens, sort) : applyTab(tokens, tab);

    const movers = [...tokens]
      .filter((t) => t.priceChange1h != null)
      .sort(
        (a, b) =>
          Math.abs(b.priceChange1h ?? 0) - Math.abs(a.priceChange1h ?? 0)
      )
      .slice(0, 20);

    const now = Date.now();
    // Fresh pairs + violent 5m moves for the discovery strip
    const alerts = [...tokens]
      .filter((t) => {
        const fresh =
          t.createdAt != null && now - t.createdAt < 1000 * 60 * 60 * 2;
        const hot5 =
          Math.abs(t.priceChange5m ?? 0) >= 8 || (t.volume5m ?? 0) > 500;
        return fresh || hot5 || t.isNative;
      })
      .sort((a, b) => {
        const sa =
          (a.isNative ? 2000 : 0) +
          Math.abs(a.priceChange5m ?? 0) * 40 +
          (a.volume5m ?? 0) +
          (a.createdAt ? Math.max(0, 7200 - (now - a.createdAt) / 1000) : 0);
        const sb =
          (b.isNative ? 2000 : 0) +
          Math.abs(b.priceChange5m ?? 0) * 40 +
          (b.volume5m ?? 0) +
          (b.createdAt ? Math.max(0, 7200 - (now - b.createdAt) / 1000) : 0);
        return sb - sa;
      })
      .slice(0, 12);

    return NextResponse.json({
      chain: "robinhood",
      chainId: 4663,
      count: tokens.length,
      tokens,
      movers,
      alerts,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "failed to fetch tokens" },
      { status: 500 }
    );
  }
}
