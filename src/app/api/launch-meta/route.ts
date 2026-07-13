import { NextRequest, NextResponse } from "next/server";
import {
  getLaunchMeta,
  saveLaunchMeta,
  normalizeUrl,
  type LaunchMeta,
} from "@/lib/launch-meta";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  const meta = await getLaunchMeta(token);
  if (!meta) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ meta });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<LaunchMeta> & {
      token?: string;
    };
    if (!body.token || !/^0x[a-fA-F0-9]{40}$/.test(body.token)) {
      return NextResponse.json({ error: "valid token address required" }, { status: 400 });
    }
    if (!body.name?.trim() || !body.symbol?.trim()) {
      return NextResponse.json(
        { error: "name and symbol required" },
        { status: 400 }
      );
    }

    const result = await saveLaunchMeta({
      token: body.token,
      pair: body.pair,
      name: body.name.trim(),
      symbol: body.symbol.trim().toUpperCase(),
      description: body.description?.trim(),
      website: normalizeUrl(body.website),
      twitter: normalizeUrl(body.twitter, "twitter"),
      tweet: normalizeUrl(body.tweet),
      telegram: normalizeUrl(body.telegram, "telegram"),
      discord: normalizeUrl(body.discord),
      github: normalizeUrl(body.github),
      farcaster: normalizeUrl(body.farcaster),
      creator: body.creator,
      lpBurned: body.lpBurned,
      lpEth: body.lpEth,
      totalSupply: body.totalSupply,
      createdAt: body.createdAt ?? Date.now(),
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "save failed" },
      { status: 400 }
    );
  }
}
