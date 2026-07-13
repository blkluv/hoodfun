import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getAdminActivity, logAdminActivity } from "@/lib/admin-activity";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await getAdminActivity();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      action?: string;
      detail?: string;
      actor?: string;
    };
    if (!body.action?.trim()) {
      return NextResponse.json({ error: "action required" }, { status: 400 });
    }
    await logAdminActivity(body.action.trim(), body.detail, body.actor);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "log failed" },
      { status: 400 }
    );
  }
}
