"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Address } from "viem";
import { TradePanel } from "./TradePanel";
import { RequireAuth } from "./RequireAuth";
import { getPublicClient } from "@/lib/wallet-tx";
import { factoryAbi } from "@/lib/abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";
import type { SiteConfig } from "@/lib/site-config";

export function TokenTradeSection({
  tokenAddress,
  symbol,
  marketHint,
}: {
  tokenAddress: string;
  symbol: string;
  marketHint?: Address | string | null;
}) {
  const search = useSearchParams();
  const [market, setMarket] = useState<string | null>(
    marketHint || search.get("market")
  );
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    if (marketHint) setMarket(marketHint);
  }, [marketHint]);

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (market) return;

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

    if (config?.featured) {
      const f = config.featured.find(
        (x) =>
          x.address.toLowerCase() === tokenAddress.toLowerCase() && x.market
      );
      if (f?.market) {
        setMarket(f.market);
        return;
      }
    }

    // Instant factory uses pairOfToken — curve markets use market query param / localStorage
    if (!isFactoryConfigured()) return;

    (async () => {
      try {
        const pc = getPublicClient();
        const pair = (await pc.readContract({
          address: FACTORY_ADDRESS as Address,
          abi: factoryAbi,
          functionName: "pairOfToken",
          args: [tokenAddress as Address],
        })) as string;
        // Instant launches trade on Uniswap, not in-app curve market
        if (pair && pair !== "0x0000000000000000000000000000000000000000") {
          // leave market null — TokenPageClient handles Uni trade UI
          return;
        }
      } catch {
        /* factory not live or legacy ABI */
      }
    })();
  }, [tokenAddress, market, config]);

  if (config?.maintenanceMode || (config && !config.tradingEnabled)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
        Trading is temporarily disabled by admin.
      </div>
    );
  }

  if (!market) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
        <p className="font-semibold text-white/70">Native trade</p>
        <p className="mt-2 text-xs leading-relaxed">
          Bonding-curve trading appears for tokens launched on HoodMemes. Use
          Uniswap for external pairs.
        </p>
      </div>
    );
  }

  const panel = (
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

  if (config?.requireLoginToTrade === false) return panel;

  return (
    <RequireAuth
      title="Log in to trade"
      blurb="Connect MetaMask or use your private quick wallet."
    >
      {panel}
    </RequireAuth>
  );
}
