import { NextRequest, NextResponse } from "next/server";
import { getLogo } from "@/lib/logo-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  const logo = await getLogo(token);
  if (!logo) {
    return new NextResponse(null, { status: 404 });
  }
  if ("redirectUrl" in logo) {
    return NextResponse.redirect(logo.redirectUrl, 302);
  }
  return new NextResponse(new Uint8Array(logo.buffer), {
    status: 200,
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
