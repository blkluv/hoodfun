import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  type Address,
} from "viem";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { factoryAbi, erc20Abi } from "@/lib/abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";

export const dynamic = "force-dynamic";

const chain = {
  id: ROBINHOOD_CHAIN.id,
  name: ROBINHOOD_CHAIN.name,
  nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [...ROBINHOOD_CHAIN.rpcUrls.default.http] },
  },
} as const;

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") as Address | null;
    if (!token || !isFactoryConfigured()) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const pc = createPublicClient({
      chain,
      transport: http(ROBINHOOD_CHAIN.rpcUrls.default.http[0]),
    });

    const zero = "0x0000000000000000000000000000000000000000";

    // Instant factory: pairOfToken + launches
    try {
      const pair = (await pc.readContract({
        address: FACTORY_ADDRESS as Address,
        abi: factoryAbi,
        functionName: "pairOfToken",
        args: [token],
      })) as Address;

      if (pair && pair !== zero) {
        const launch = await pc.readContract({
          address: FACTORY_ADDRESS as Address,
          abi: factoryAbi,
          functionName: "launches",
          args: [token],
        });

        const pairAddr = launch[1] || pair;
        const creator = launch[2];
        const totalSupply = launch[3];
        const lpEth = launch[4];
        const lpBurned = launch[5];
        const createdAt = launch[6];
        // New factory ABI: index 7 = creatorBps. Old live factory may omit it.
        const creatorBpsRaw = (launch as readonly unknown[])[7];
        const creatorBps =
          creatorBpsRaw != null ? Number(creatorBpsRaw as number | bigint) : undefined;

        let name = "Token";
        let symbol = "TOKEN";
        try {
          [name, symbol] = await Promise.all([
            pc.readContract({
              address: token,
              abi: erc20Abi,
              functionName: "name",
            }) as Promise<string>,
            pc.readContract({
              address: token,
              abi: erc20Abi,
              functionName: "symbol",
            }) as Promise<string>,
          ]);
        } catch {
          /* ignore */
        }

        return NextResponse.json({
          kind: "instant",
          token,
          pair: pairAddr,
          creator,
          totalSupply: totalSupply?.toString(),
          lpEth: lpEth?.toString(),
          lpBurned,
          creatorBps:
            creatorBps != null && Number.isFinite(creatorBps)
              ? creatorBps
              : undefined,
          createdAt: Number(createdAt) * 1000,
          name,
          symbol,
        });
      }
    } catch {
      /* not instant factory or wrong ABI */
    }

    return NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
