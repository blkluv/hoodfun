import { NextRequest, NextResponse } from "next/server";
import {
  getVerifiedByAddress,
  getVerifiedByHandle,
  unlinkVerified,
  normalizeHandle,
  profileUrl,
} from "@/lib/x-verify";
import { verifyMessage } from "viem";

export const dynamic = "force-dynamic";

/** GET ?address=0x… or ?handle=name — public lookup */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const handle = req.nextUrl.searchParams.get("handle");

  if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
    const v = await getVerifiedByAddress(address);
    if (!v) {
      return NextResponse.json({ verified: false });
    }
    return NextResponse.json({
      verified: true,
      address: v.address,
      handle: v.handle,
      profileUrl: profileUrl(v.handle),
      verifiedAt: v.verifiedAt,
      tweetUrl: v.tweetUrl,
    });
  }

  if (handle) {
    const h = normalizeHandle(handle);
    if (!h) {
      return NextResponse.json({ error: "invalid handle" }, { status: 400 });
    }
    const v = await getVerifiedByHandle(h);
    if (!v) {
      return NextResponse.json({ verified: false });
    }
    return NextResponse.json({
      verified: true,
      address: v.address,
      handle: v.handle,
      profileUrl: profileUrl(v.handle),
      verifiedAt: v.verifiedAt,
      tweetUrl: v.tweetUrl,
    });
  }

  return NextResponse.json(
    { error: "address or handle required" },
    { status: 400 }
  );
}

/** DELETE — unlink verification (requires wallet signature of unlink message) */
export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      address?: string;
      signature?: string;
    };
    if (!body.address || !/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      return NextResponse.json({ error: "valid address required" }, { status: 400 });
    }
    if (!body.signature) {
      return NextResponse.json({ error: "signature required" }, { status: 400 });
    }

    const message = `Unlink X verification on hoodmemes.com\nWallet: ${body.address.toLowerCase()}`;
    const ok = await verifyMessage({
      address: body.address as `0x${string}`,
      message,
      signature: body.signature as `0x${string}`,
    });
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    await unlinkVerified(body.address);
    return NextResponse.json({ ok: true, verified: false });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unlink failed" },
      { status: 400 }
    );
  }
}
