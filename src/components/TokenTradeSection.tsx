"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Address } from "viem";
import { TradePanel } from "./TradePanel";
import { getPublicClient } from "@/lib/sessionWallet";
import { factoryAbi } from "@/lib/abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";

export function TokenTradeSection({
  tokenAddress,
  symbol,
}: {
  tokenAddress: string;
  symbol: string;
}) {
  const search = useSearchParams();
  const [market, setMarket] = useState<string | null>(
    search.get("market")
  );

  useEffect(() => {
    // local launches
    try {
      const raw = localStorage.getItem("hoodmemes_launches");
      if (raw) {
        const list = JSON.parse(raw) as Array<{ token: string; market: string }>;
        const hit = list.find(
          (x) => x.token.toLowerCase() === tokenAddress.toLowerCase()
        );
        if (hit?.market) {
          setMarket(hit.market);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    if (!isFactoryConfigured() || market) return;

    (async () => {
      try {
        const pc = getPublicClient();
        const m = (await pc.readContract({
          address: FACTORY_ADDRESS as Address,
          abi: factoryAbi,
          functionName: "marketOfToken",
          args: [tokenAddress as Address],
        })) as string;
        if (m && m !== "0x0000000000000000000000000000000000000000") {
          setMarket(m);
        }
      } catch {
        /* factory not live */
      }
    })();
  }, [tokenAddress, market]);

  if (!market) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
        <p className="font-semibold text-white/70">Native trade</p>
        <p className="mt-2 text-xs leading-relaxed">
          Bonding-curve trading appears here for tokens launched on HoodMemes.
          External Uniswap memes (DexScreener) use the Trade on Uniswap button
          until we add a router. Deploy the factory and launch from{" "}
          <a href="/create" className="text-[#00c805]">
            /create
          </a>{" "}
          to enable one-click quick-wallet buys.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/50">
        Trade on HoodMemes
      </h2>
      <TradePanel
        marketAddress={market as Address}
        tokenAddress={tokenAddress as Address}
        symbol={symbol}
      />
    </div>
  );
}
