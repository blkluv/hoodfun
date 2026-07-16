import { NextRequest, NextResponse } from "next/server";
import {
  getChatMessages,
  postChatMessage,
  hashIp,
} from "@/lib/token-chat-store";
import { getVerifiedByAddress } from "@/lib/x-verify";
import { createPublicClient, http, type Address, parseAbi } from "viem";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { RPC_URL } from "@/lib/contracts";

export const dynamic = "force-dynamic";

const ipRate = new Map<string, number>();

const erc20Bal = parseAbi([
  "function balanceOf(address) view returns (uint256)",
]);

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim();
    if (!token || !/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    const messages = await getChatMessages(token, 80);
    return NextResponse.json(
      { token: token.toLowerCase(), messages, count: messages.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3, stale-while-revalidate=10",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      token?: string;
      address?: string;
      text?: string;
      /** optional proof: "hoodmemes-chat:{token}:{address}:{ts}" signed — soft trust for now */
      signature?: string;
    };

    const token = (body.token || "").trim();
    const address = (body.address || "").trim();
    const text = (body.text || "").trim();

    if (!token || !/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Connect wallet to chat" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ipKey = hashIp(ip);
    const now = Date.now();
    if ((ipRate.get(ipKey) || 0) > now - 3_000) {
      return NextResponse.json(
        { error: "Too many messages — wait a moment" },
        { status: 429 }
      );
    }
    ipRate.set(ipKey, now);

    // Optional holder badge (non-blocking)
    let isHolder = false;
    try {
      const pc = createPublicClient({
        chain: {
          id: ROBINHOOD_CHAIN.id,
          name: ROBINHOOD_CHAIN.name,
          nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
          rpcUrls: { default: { http: [RPC_URL] } },
        },
        transport: http(RPC_URL),
      });
      const bal = (await pc.readContract({
        address: token as Address,
        abi: erc20Bal,
        functionName: "balanceOf",
        args: [address as Address],
      })) as bigint;
      isHolder = bal > 0n;
    } catch {
      /* ignore — chat still works */
    }

    let handle: string | undefined;
    try {
      const v = await getVerifiedByAddress(address);
      if (v?.handle) handle = v.handle;
    } catch {
      /* */
    }

    const msg = await postChatMessage({
      token,
      address,
      text,
      handle,
    });

    return NextResponse.json({
      ok: true,
      message: msg,
      isHolder,
      holderNote: isHolder
        ? "Holder badge available on future updates"
        : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed";
    const status =
      message.includes("Slow down") || message.includes("Links")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
