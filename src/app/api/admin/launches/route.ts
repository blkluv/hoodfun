import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";
import { getAllLaunchMeta } from "@/lib/launch-meta";

export const dynamic = "force-dynamic";

/**
 * Admin launch list — sourced from launch-meta store.
 * V3 factory does not enumerate allTokens on-chain (by design); meta is the ledger.
 */
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metaMap = await getAllLaunchMeta();
  const metaList = Object.values(metaMap).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  return NextResponse.json({
    factory: isFactoryConfigured() ? FACTORY_ADDRESS : null,
    count: metaList.length,
    launches: metaList.map((m) => ({
      token: m.token,
      pair: m.pair,
      pool: m.pair,
      name: m.name,
      symbol: m.symbol,
      creator: m.creator,
      creatorBps: m.creatorBps ?? 0,
      lpBurned: m.lpBurned ?? true,
      lpEth: m.lpEth ?? m.buyEth,
      buyEth: m.buyEth,
      createdAt: m.createdAt,
      description: m.description,
      website: m.website,
      twitter: m.twitter,
      telegram: m.telegram,
      v3: m.v3 ?? true,
      source: "meta" as const,
    })),
  });
}
