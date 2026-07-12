import { NextRequest, NextResponse } from "next/server";
import { fetchRobinhoodTokens, fetchTokenByAddress } from "@/lib/dexscreener";
import type { SortKey, TokenCardData } from "@/lib/types";

export const revalidate = 30;

function sortTokens(tokens: TokenCardData[], sort: SortKey): TokenCardData[] {
  const arr = [...tokens];
  arr.sort((a, b) => {
    const av = a[sort] ?? -Infinity;
    const bv = b[sort] ?? -Infinity;
    return (bv as number) - (av as number);
  });
  return arr;
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
    const sort = (searchParams.get("sort") as SortKey) || "marketCap";
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
    tokens = sortTokens(tokens, sort);

    return NextResponse.json({
      chain: "robinhood",
      chainId: 4663,
      count: tokens.length,
      tokens,
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
