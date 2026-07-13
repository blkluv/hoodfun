import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  type Address,
} from "viem";
import { isAdminSession } from "@/lib/admin-auth";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { factoryAbi, erc20Abi } from "@/lib/abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";
import { getAllLaunchMeta } from "@/lib/launch-meta";

export const dynamic = "force-dynamic";

const chain = {
  id: ROBINHOOD_CHAIN.id,
  name: ROBINHOOD_CHAIN.name,
  nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [...ROBINHOOD_CHAIN.rpcUrls.default.http] },
  },
} as const;

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metaMap = await getAllLaunchMeta();
  const metaList = Object.values(metaMap).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  if (!isFactoryConfigured()) {
    return NextResponse.json({
      factory: null,
      launches: metaList.map((m) => ({
        token: m.token,
        pair: m.pair,
        name: m.name,
        symbol: m.symbol,
        creator: m.creator,
        creatorBps: m.creatorBps,
        lpBurned: m.lpBurned,
        lpEth: m.lpEth,
        createdAt: m.createdAt,
        source: "meta" as const,
      })),
    });
  }

  try {
    const pc = createPublicClient({
      chain,
      transport: http(ROBINHOOD_CHAIN.rpcUrls.default.http[0]),
    });

    const len = Number(
      await pc.readContract({
        address: FACTORY_ADDRESS as Address,
        abi: factoryAbi,
        functionName: "allTokensLength",
      })
    );

    const max = Math.min(len, 50);
    const launches: Array<Record<string, unknown>> = [];

    for (let i = len - 1; i >= 0 && launches.length < max; i--) {
      try {
        const token = (await pc.readContract({
          address: FACTORY_ADDRESS as Address,
          abi: factoryAbi,
          functionName: "allTokens",
          args: [BigInt(i)],
        })) as Address;

        const launch = await pc.readContract({
          address: FACTORY_ADDRESS as Address,
          abi: factoryAbi,
          functionName: "launches",
          args: [token],
        });

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
          /* */
        }

        const meta = metaMap[token.toLowerCase()];
        launches.push({
          token,
          pair: launch[1],
          creator: launch[2],
          totalSupply: launch[3]?.toString?.() ?? String(launch[3]),
          lpEth: launch[4]?.toString?.() ?? String(launch[4]),
          lpBurned: launch[5],
          createdAt: Number(launch[6]) * 1000,
          creatorBps: Number((launch as readonly unknown[])[7] ?? 0),
          name: meta?.name || name,
          symbol: meta?.symbol || symbol,
          description: meta?.description,
          website: meta?.website,
          twitter: meta?.twitter,
          telegram: meta?.telegram,
          source: "factory",
        });
      } catch {
        /* skip one */
      }
    }

    return NextResponse.json({
      factory: FACTORY_ADDRESS,
      count: len,
      launches,
    });
  } catch (e) {
    return NextResponse.json({
      factory: FACTORY_ADDRESS,
      error: e instanceof Error ? e.message : "factory read failed",
      launches: metaList,
    });
  }
}
