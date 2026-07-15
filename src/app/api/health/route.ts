import { NextRequest, NextResponse } from "next/server";
import { computeLaunchHealth } from "@/lib/launch-health";

export const dynamic = "force-dynamic";
export const revalidate = 45;

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim();
    if (!token || !/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return NextResponse.json(
        { error: "valid token address required" },
        { status: 400 }
      );
    }

    const health = await computeLaunchHealth(token);
    if (!health) {
      return NextResponse.json({ error: "unable to score" }, { status: 404 });
    }

    return NextResponse.json(
      { health },
      {
        headers: {
          "Cache-Control": "public, s-maxage=45, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    console.error("[health]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
