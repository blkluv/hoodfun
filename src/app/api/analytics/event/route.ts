import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { trackEvent } from "@/lib/analytics-store";

export const dynamic = "force-dynamic";

/** Lightweight first-party pageview / event beacon */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      event?: string;
      path?: string;
    };
    const event = (body.event || "pageview").slice(0, 40);
    if (!["pageview", "launch", "create_open", "bridge_open"].includes(event)) {
      return NextResponse.json({ ok: true });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0";
    const ua = req.headers.get("user-agent") || "";
    const uniqueKey = createHash("sha256")
      .update(`${ip}|${ua.slice(0, 80)}`)
      .digest("hex")
      .slice(0, 16);

    await trackEvent(event, {
      uniqueKey: event === "pageview" ? uniqueKey : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
