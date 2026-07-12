import { NextRequest, NextResponse } from "next/server";
import { fetchRobinhoodTokens, fetchTokenByAddress } from "@/lib/dexscreener";
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
      return sortTokens(
        tokens.filter((t) => (t.volume1h ?? 0) > 0 || (t.txns24h ?? 0) > 5),
        "volume1h"
      );
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const address = searchParams.get("address");
    if (address) {
      const token = await fetchTokenByAddress(address);
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
    if (minLiq > 0) {
      tokens = tokens.filter((t) => (t.liquidity ?? 0) >= minLiq);
    }

    tokens = sort ? sortTokens(tokens, sort) : applyTab(tokens, tab);

    const movers = [...tokens]
      .filter((t) => t.priceChange1h != null)
      .sort(
        (a, b) =>
          Math.abs(b.priceChange1h ?? 0) - Math.abs(a.priceChange1h ?? 0)
      )
      .slice(0, 20);

    return NextResponse.json({
      chain: "robinhood",
      chainId: 4663,
      count: tokens.length,
      tokens,
      movers,
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
