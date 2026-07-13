import { NextRequest, NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import {
  getAllVerified,
  getVerifiedByAddress,
  unlinkVerified,
} from "@/lib/x-verify";
import { logAdminActivity } from "@/lib/admin-activity";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const items = await getAllVerified();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { address?: string };
    if (!body.address || !/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      return NextResponse.json({ error: "address required" }, { status: 400 });
    }
    const existing = await getVerifiedByAddress(body.address);
    await unlinkVerified(body.address);
    await logAdminActivity(
      "revoke_x_verify",
      existing ? `@${existing.handle} · ${body.address}` : body.address
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 400 }
    );
  }
}
