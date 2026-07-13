import { NextRequest, NextResponse } from "next/server";
import { saveLogo } from "@/lib/logo-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST { token, imageBase64, contentType? }
 * Saves logo for a token after launch.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      token?: string;
      imageBase64?: string;
      contentType?: string;
    };

    if (!body.token || !/^0x[a-fA-F0-9]{40}$/.test(body.token)) {
      return NextResponse.json(
        { error: "valid token address required" },
        { status: 400 }
      );
    }
    if (!body.imageBase64?.trim()) {
      return NextResponse.json(
        { error: "imageBase64 required" },
        { status: 400 }
      );
    }

    const result = await saveLogo(
      body.token,
      body.contentType || "image/jpeg",
      body.imageBase64
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "upload failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: result.url,
      storage: result.storage,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upload failed" },
      { status: 500 }
    );
  }
}
