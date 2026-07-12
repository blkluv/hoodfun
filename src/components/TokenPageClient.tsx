"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Address } from "viem";
import type { CurveSnapshot } from "@/lib/curve";
import type { TokenCardData } from "@/lib/types";
import { CurveChart, CurveStats, RecentTrades } from "./CurveChart";
import { TokenTradeSection } from "./TokenTradeSection";
import { formatPct, formatUsd, shortAddr, timeAgo } from "@/lib/format";
import { ROBINHOOD_CHAIN, UNISWAP_APP } from "@/lib/chain";
import { Suspense } from "react";

export function TokenPageClient({
  address,
  marketHint,
  dexToken,
}: {
  address: string;
  marketHint?: string | null;
  dexToken: TokenCardData | null;
}) {
  const [curve, setCurve] = useState<CurveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ token: address });
      if (marketHint) params.set("market", marketHint);
      const res = await fetch(`/api/curve?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCurve(data.curve);
        setErr(null);
      } else if (res.status === 404) {
        setCurve(null);
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "Failed to load curve");
      }
    } catch {
      setErr("Failed to load curve");
    } finally {
      setLoading(false);
    }
  }, [address, marketHint]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const isNative = !!curve;
  const symbol = curve?.symbol ?? dexToken?.symbol ?? "TOKEN";
  const name = curve?.name ?? dexToken?.name ?? shortAddr(address);
  const explorer = `${ROBINHOOD_CHAIN.blockExplorers.default.url}/token/${address}`;
  const marketExplorer = curve
    ? `${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${curve.market}`
    : null;
  const tradeUrl = `${UNISWAP_APP}/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${address}`;
  const chartSrc = dexToken?.pairAddress
    ? `https://dexscreener.com/robinhood/${dexToken.pairAddress}?embed=1&theme=dark&trades=0&info=0`
    : null;
  const up = (dexToken?.priceChange24h ?? 0) >= 0;

  return (
    <div className="space-y-6 py-6">
      <Link
        href="/"
        className="inline-flex text-sm text-white/45 hover:text-[#00c805]"
      >
        ← Board
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {dexToken?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dexToken.imageUrl}
              alt={symbol}
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00c805]/20 text-2xl font-black text-[#00c805] ring-1 ring-[#00c805]/30">
              {symbol[0]}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-white">
                ${symbol}{" "}
                <span className="text-base font-normal text-white/40">{name}</span>
              </h1>
              {isNative && (
                <span className="rounded-md bg-[#00c805]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00c805]">
                  HoodMemes curve
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-white/35 break-all">{address}</p>
            {dexToken?.createdAt && (
              <p className="mt-1 text-xs text-white/40">
                Created {timeAgo(dexToken.createdAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isNative && marketExplorer && (
            <a
              href={marketExplorer}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[#00c805]/30 bg-[#00c805]/10 px-4 py-2.5 text-sm font-semibold text-[#00c805] hover:bg-[#00c805]/15"
            >
              Market ↗
            </a>
          )}
          {dexToken && (
            <a
              href={tradeUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"
            >
              Uniswap ↗
            </a>
          )}
          {dexToken?.dexscreenerUrl && (
            <a
              href={dexToken.dexscreenerUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"
            >
              DexScreener
            </a>
          )}
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"
          >
            Explorer
          </a>
        </div>
      </div>

      {loading && !curve && !dexToken && (
        <div className="hm-shimmer h-40 rounded-2xl" />
      )}

      {err && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          {err}
        </div>
      )}

      {isNative && curve ? (
        <CurveStats curve={curve} />
      ) : dexToken ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Price" value={formatUsd(dexToken.priceUsd, false)} />
          <Metric label="Market cap" value={formatUsd(dexToken.marketCap)} />
          <Metric label="Volume 24h" value={formatUsd(dexToken.volume24h)} />
          <Metric
            label="24h"
            value={formatPct(dexToken.priceChange24h)}
            accent={up ? "up" : "down"}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {isNative && curve ? (
            <>
              <CurveChart curve={curve} />
              <RecentTrades curve={curve} />
              {curve.fees && (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[11px] text-white/40">
                  Fees: buy {(curve.fees.buyFeeBps / 100).toFixed(1)}% · sell{" "}
                  {(curve.fees.sellFeeBps / 100).toFixed(1)}% · creator{" "}
                  {(curve.fees.feeCreatorBps / 100).toFixed(0)}% of fees ·
                  buyback-burn {(curve.fees.feeBuybackBurnBps / 100).toFixed(0)}%
                  · token burn on buy{" "}
                  {(curve.fees.tokenBurnOnBuyBps / 100).toFixed(1)}%
                </div>
              )}
            </>
          ) : chartSrc ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <iframe
                title={`${symbol} chart`}
                src={chartSrc}
                className="h-[420px] w-full"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-white/40">
              {loading
                ? "Loading market…"
                : "No bonding curve or DexScreener pair found for this address."}
            </div>
          )}
        </div>

        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
          }
        >
          <TokenTradeSection
            tokenAddress={address}
            symbol={symbol}
            marketHint={(marketHint || curve?.market) as Address | undefined}
          />
        </Suspense>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "up" | "down";
}) {
  const color =
    accent === "up"
      ? "text-[#00c805]"
      : accent === "down"
        ? "text-rose-400"
        : "text-white";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/35">
        {label}
      </div>
      <div className={`mt-0.5 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
