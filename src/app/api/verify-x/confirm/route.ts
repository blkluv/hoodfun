import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import {
  getChallenge,
  clearChallenge,
  saveVerified,
  parseTweetId,
  fetchTweetText,
  tweetMatchesChallenge,
  normalizeHandle,
  profileUrl,
  getVerifiedByHandle,
} from "@/lib/x-verify";

export const dynamic = "force-dynamic";

/**
 * POST { address, handle, signature, tweetUrl }
 * 1) EIP-191 signature over challenge message
 * 2) Public tweet contains code + wallet
 * 3) Tweet author matches claimed handle (when available)
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      address?: string;
      handle?: string;
      signature?: string;
      tweetUrl?: string;
    };

    if (!body.address || !/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      return NextResponse.json({ error: "valid address required" }, { status: 400 });
    }
    if (!body.signature?.startsWith("0x")) {
      return NextResponse.json({ error: "wallet signature required" }, { status: 400 });
    }
    if (!body.tweetUrl?.trim()) {
      return NextResponse.json(
        { error: "Paste the URL of your verification tweet" },
        { status: 400 }
      );
    }

    const handle = normalizeHandle(body.handle || "");
    if (!handle) {
      return NextResponse.json({ error: "valid handle required" }, { status: 400 });
    }

    const challenge = await getChallenge(body.address);
    if (!challenge) {
      return NextResponse.json(
        {
          error:
            "Challenge expired or missing. Generate a new verification code.",
        },
        { status: 400 }
      );
    }

    if (challenge.handle !== handle) {
      return NextResponse.json(
        {
          error: `Challenge was for @${challenge.handle}, not @${handle}. Start over.`,
        },
        { status: 400 }
      );
    }

    const sigOk = await verifyMessage({
      address: body.address as `0x${string}`,
      message: challenge.message,
      signature: body.signature as `0x${string}`,
    });
    if (!sigOk) {
      return NextResponse.json(
        { error: "Signature does not match this wallet. Sign the challenge message." },
        { status: 401 }
      );
    }

    const tweetId = parseTweetId(body.tweetUrl);
    if (!tweetId) {
      return NextResponse.json(
        {
          error:
            "Invalid tweet URL. Use https://x.com/yourhandle/status/123…",
        },
        { status: 400 }
      );
    }

    const tweet = await fetchTweetText(tweetId);
    if (!tweet?.text) {
      return NextResponse.json(
        {
          error:
            "Could not read that tweet. Make sure it’s public, wait a few seconds, and try again.",
        },
        { status: 400 }
      );
    }

    if (!tweetMatchesChallenge(tweet.text, challenge)) {
      return NextResponse.json(
        {
          error:
            "Tweet must include your full wallet address and the verification code exactly as shown.",
        },
        { status: 400 }
      );
    }

    // Prefer author match when the free endpoint returns it
    if (tweet.author && tweet.author !== handle) {
      return NextResponse.json(
        {
          error: `That tweet is from @${tweet.author}, not @${handle}. Post from the account you’re linking.`,
        },
        { status: 400 }
      );
    }

    const taken = await getVerifiedByHandle(handle);
    if (taken && taken.address !== body.address.toLowerCase()) {
      return NextResponse.json(
        { error: `@${handle} is already linked to another wallet.` },
        { status: 409 }
      );
    }

    const { ok, entry } = await saveVerified({
      address: body.address.toLowerCase(),
      handle,
      verifiedAt: Date.now(),
      tweetUrl: body.tweetUrl.trim(),
      tweetId,
      code: challenge.code,
    });

    await clearChallenge(body.address);

    return NextResponse.json(
      {
        ok,
        verified: true,
        address: entry.address,
        handle: entry.handle,
        profileUrl: profileUrl(entry.handle),
        verifiedAt: entry.verifiedAt,
        tweetUrl: entry.tweetUrl,
      },
      { status: ok ? 200 : 207 }
    );
  } catch (e) {
    console.error("verify-x confirm", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "verification failed" },
      { status: 500 }
    );
  }
}
