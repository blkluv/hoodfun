import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { diagnosePersistence } from "@/lib/config-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const diag = await diagnosePersistence();
  return NextResponse.json(diag);
}
