import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getAnalyticsSummary } from "@/lib/analytics-store";
import { listContacts } from "@/lib/contact-store";
import { getAllLaunchMeta } from "@/lib/launch-meta";
import { getAllVerified } from "@/lib/x-verify";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [analytics, contacts, metaMap, verified] = await Promise.all([
      getAnalyticsSummary(30),
      listContacts(),
      getAllLaunchMeta().catch(() => ({})),
      getAllVerified().catch(() => []),
    ]);

    const launches = Object.values(metaMap);
    const now = Date.now();
    const day = 86_400_000;
    const launches24h = launches.filter(
      (m) => m.createdAt && now - m.createdAt < day
    ).length;
    const launches7d = launches.filter(
      (m) => m.createdAt && now - m.createdAt < 7 * day
    ).length;
    const v3Count = launches.filter((m) => m.v3 !== false).length;

    // launches per day (from meta, last 14d)
    const byDay: Record<string, number> = {};
    for (const m of launches) {
      if (!m.createdAt) continue;
      const d = new Date(m.createdAt).toISOString().slice(0, 10);
      byDay[d] = (byDay[d] || 0) + 1;
    }
    const launchSeries = Object.entries(byDay)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 14)
      .map(([date, count]) => ({ date, count }));

    // top creators
    const creatorMap = new Map<string, number>();
    for (const m of launches) {
      if (!m.creator) continue;
      const k = m.creator.toLowerCase();
      creatorMap.set(k, (creatorMap.get(k) || 0) + 1);
    }
    const topCreators = [...creatorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, count]) => ({ address, count }));

    const unreadContacts = contacts.filter((c) => !c.read).length;

    return NextResponse.json({
      traffic: analytics,
      launches: {
        total: launches.length,
        v3: v3Count,
        last24h: launches24h,
        last7d: launches7d,
        series: launchSeries,
        topCreators,
        recent: launches
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 8)
          .map((m) => ({
            token: m.token,
            symbol: m.symbol,
            name: m.name,
            creator: m.creator,
            createdAt: m.createdAt,
            buyEth: m.buyEth || m.lpEth,
          })),
      },
      contacts: {
        total: contacts.length,
        unread: unreadContacts,
        recent: contacts.slice(0, 20),
      },
      community: {
        verifiedX: Array.isArray(verified) ? verified.length : 0,
      },
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error("[admin/analytics]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
