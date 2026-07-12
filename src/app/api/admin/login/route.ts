import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieHeader,
  checkPassword,
  createAdminToken,
  isAdminWallet,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      password?: string;
      wallet?: string;
    };
    const passwordOk = body.password && checkPassword(body.password);
    const walletOk = body.wallet && isAdminWallet(body.wallet);

    // Password always works. Wallet alone works only if ADMIN_ALLOW_WALLET_ONLY=true
    const walletOnly =
      process.env.ADMIN_ALLOW_WALLET_ONLY === "true" && walletOk;

    if (!passwordOk && !walletOnly) {
      if (walletOk && !passwordOk) {
        return NextResponse.json(
          { error: "Admin wallet recognized — enter password to continue" },
          { status: 401 }
        );
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createAdminToken();
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", adminCookieHeader(token));
    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
