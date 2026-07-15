import { NextRequest, NextResponse } from "next/server";
import { addContact } from "@/lib/contact-store";
import { trackEvent } from "@/lib/analytics-store";

export const dynamic = "force-dynamic";

const RATE = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      company?: string; // honeypot
      source?: string;
    };

    // Honeypot — bots fill hidden fields
    if (body.company) {
      return NextResponse.json({ ok: true });
    }

    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const subject = (body.subject || "").trim() || "Website contact";
    const message = (body.message || "").trim();

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (message.length < 10 || message.length > 4000) {
      return NextResponse.json(
        { error: "Message must be 10–4000 characters" },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const now = Date.now();
    const last = RATE.get(ip) || 0;
    if (now - last < 30_000) {
      return NextResponse.json(
        { error: "Please wait a moment before sending again" },
        { status: 429 }
      );
    }
    RATE.set(ip, now);

    const msg = await addContact({
      name,
      email,
      subject,
      message,
      source: body.source || "contact-page",
    });
    await trackEvent("contact").catch(() => null);

    return NextResponse.json({ ok: true, id: msg.id });
  } catch (e) {
    console.error("[contact]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
