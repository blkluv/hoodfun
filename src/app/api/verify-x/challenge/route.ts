import { NextRequest, NextResponse } from "next/server";
import {
  buildChallenge,
  normalizeHandle,
  saveChallenge,
  getVerifiedByAddress,
  getVerifiedByHandle,
  profileUrl,
} from "@/lib/x-verify";

export const dynamic = "force-dynamic";

/**
 * POST { address, handle }
 * Creates a challenge: sign message + tweet text with unique code.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      address?: string;
      handle?: string;
    };

    if (!body.address || !/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      return NextResponse.json(
        { error: "valid wallet address required" },
        { status: 400 }
      );
    }

    const handle = normalizeHandle(body.handle || "");
    if (!handle) {
      return NextResponse.json(
        {
          error:
            "Enter a valid X handle (1–15 letters, numbers, underscore)",
        },
        { status: 400 }
      );
    }

    // If handle already verified to another wallet, block re-claim without unlink
    const existingHandle = await getVerifiedByHandle(handle);
    if (
      existingHandle &&
      existingHandle.address !== body.address.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error: `@${handle} is already linked to another wallet. They must unlink first.`,
        },
        { status: 409 }
      );
    }

    // Already linked this handle to this wallet
    const existingAddr = await getVerifiedByAddress(body.address);
    if (existingAddr?.handle === handle) {
      return NextResponse.json({
        alreadyVerified: true,
        address: existingAddr.address,
        handle: existingAddr.handle,
        profileUrl: profileUrl(existingAddr.handle),
        verifiedAt: existingAddr.verifiedAt,
      });
    }

    const ch = buildChallenge(body.address, handle);
    await saveChallenge(ch);

    return NextResponse.json({
      address: ch.address,
      handle: ch.handle,
      code: ch.code,
      message: ch.message,
      tweetText: ch.tweetText,
      expiresAt: ch.expiresAt,
      profileUrl: profileUrl(ch.handle),
      composeUrl: `https://x.com/intent/tweet?text=${encodeURIComponent(ch.tweetText)}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "challenge failed" },
      { status: 500 }
    );
  }
}
