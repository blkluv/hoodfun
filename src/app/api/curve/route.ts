import { NextRequest, NextResponse } from "next/server";
import type { Address } from "viem";
import { fetchCurveSnapshot } from "@/lib/curve";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") as Address | null;
    const market = req.nextUrl.searchParams.get("market") as Address | null;
    if (!token && !market) {
      return NextResponse.json(
        { error: "token or market required" },
        { status: 400 }
      );
    }
    const snap = await fetchCurveSnapshot((token || market) as Address, {
      market: market ?? undefined,
    });
    if (!snap) {
      return NextResponse.json({ error: "not a HoodMemes curve token" }, { status: 404 });
    }
    return NextResponse.json({ curve: snap, updatedAt: Date.now() });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
