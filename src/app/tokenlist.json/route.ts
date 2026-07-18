import { NextResponse } from "next/server";
import { buildHoodTokenList } from "@/lib/tokenlist";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/** Uniswap Token List JSON — import at https://www.hoodmemes.com/tokenlist.json */
export async function GET() {
  try {
    const list = await buildHoodTokenList();
    return NextResponse.json(list, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        name: "HoodMemes",
        timestamp: new Date().toISOString(),
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [],
        error: e instanceof Error ? e.message : "failed",
      },
      { status: 500 }
    );
  }
}
