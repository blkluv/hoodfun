import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getSiteConfig, saveSiteConfig } from "@/lib/config-store";
import type { SiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = await getSiteConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Partial<SiteConfig>;
    const result = await saveSiteConfig(body);
    // 200 even for memory fallback so UI can show export helper
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 400 }
    );
  }
}
