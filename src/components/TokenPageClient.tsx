"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import type { Address } from "viem";
import type { CurveSnapshot } from "@/lib/curve";
import type { TokenCardData } from "@/lib/types";
import { CurveChart, CurveStats, RecentTrades } from "./CurveChart";
import { TokenTradeSection } from "./TokenTradeSection";
import { formatPct, formatUsd, shortAddr, timeAgo } from "@/lib/format";
import { ROBINHOOD_CHAIN, UNISWAP_APP } from "@/lib/chain";
import { VerifiedBadge } from "./VerifyXPanel";

type InstantLaunch = {
  kind: "instant";
  token: string;
  pair: string;
  creator: string;
  totalSupply?: string;
  lpEth?: string;
  lpBurned?: boolean;
  /** basis points: 0 / 100 / 500 / 1000 → Creator X% badge */
  creatorBps?: number;
  createdAt?: number;
  name: string;
  symbol: string;
};

export function TokenPageClient({
  address,
  marketHint,
  pairHint,
  dexToken,
}: {
  address: string;
  marketHint?: string | null;
  pairHint?: string | null;
  dexToken: TokenCardData | null;
}) {
  const [curve, setCurve] = useState<CurveSnapshot | null>(null);
  const [instant, setInstant] = useState<InstantLaunch | null>(null);
  const [meta, setMeta] = useState<{
    description?: string;
    website?: string;
    twitter?: string;
    tweet?: string;
    telegram?: string;
    discord?: string;
    github?: string;
    farcaster?: string;
    creatorBps?: number;
    creator?: string;
  } | null>(null);
  const [launcherX, setLauncherX] = useState<{
    handle: string;
    profileUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadLauncherVerify = useCallback(async (creatorAddr: string | undefined | null) => {
    if (!creatorAddr || !/^0x[a-fA-F0-9]{40}$/.test(creatorAddr)) {
      setLauncherX(null);
      return;
    }
    try {
      const res = await fetch(`/api/verify-x?address=${creatorAddr}`);
      const data = await res.json();
      if (data?.verified && data.handle) {
        setLauncherX({
          handle: data.handle,
          profileUrl: data.profileUrl || `https://x.com/${data.handle}`,
        });
      } else {
        setLauncherX(null);
      }
    } catch {
      setLauncherX(null);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      // Off-chain social / authority meta
      fetch(`/api/launch-meta?token=${address}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.meta) {
            setMeta(d.meta);
            if (d.meta.creator) loadLauncherVerify(d.meta.creator);
          }
        })
        .catch(() => null);

      // Instant Uniswap launch first
      const launchRes = await fetch(`/api/launch?token=${address}`);
      if (launchRes.ok) {
        const data = (await launchRes.json()) as InstantLaunch;
        setInstant(data);
        setCurve(null);
        setErr(null);
        setLoading(false);
        if (data.creator) loadLauncherVerify(data.creator);
        return;
      }

      // Legacy bonding curve
      const params = new URLSearchParams({ token: address });
      if (marketHint) params.set("market", marketHint);
      const res = await fetch(`/api/curve?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCurve(data.curve);
        setInstant(null);
        setErr(null);
        if (data.curve?.creator) loadLauncherVerify(data.curve.creator);
      } else if (res.status === 404) {
        setCurve(null);
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "Failed to load market");
      }
    } catch {
      setErr("Failed to load market");
    } finally {
      setLoading(false);
    }
  }, [address, marketHint, loadLauncherVerify]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  const isCurve = !!curve && !instant;
  const isInstant = !!instant;

  const symbol =
    instant?.symbol ?? curve?.symbol ?? dexToken?.symbol ?? "TOKEN";
  const name =
    instant?.name ?? curve?.name ?? dexToken?.name ?? shortAddr(address);
  const explorer = `${ROBINHOOD_CHAIN.blockExplorers.default.url}/token/${address}`;
  const tradeUrl = `${UNISWAP_APP}/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${address}`;

  const pairAddress =
    pairHint ||
    instant?.pair ||
    curve?.uniswapPair ||
    dexToken?.pairAddress ||
    null;

  const chartSrc = pairAddress
    ? `https://dexscreener.com/robinhood/${pairAddress}?embed=1&theme=dark&trades=0&info=0`
    : dexToken?.pairAddress
      ? `https://dexscreener.com/robinhood/${dexToken.pairAddress}?embed=1&theme=dark&trades=0&info=0`
      : null;

  const dexscreenerUrl = pairAddress
    ? `https://dexscreener.com/robinhood/${pairAddress}`
    : dexToken?.dexscreenerUrl;

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
              {isInstant && (
                <span className="rounded-md bg-[#00c805]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00c805]">
                  Uniswap live
                </span>
              )}
              {isCurve && (
                <span className="rounded-md bg-[#00c805]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00c805]">
                  HoodMemes curve
                </span>
              )}
              {instant?.lpBurned && (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/60">
                  LP burned
                </span>
              )}
              {(() => {
                const bps =
                  typeof instant?.creatorBps === "number"
                    ? instant.creatorBps
                    : typeof meta?.creatorBps === "number"
                      ? meta.creatorBps
                      : null;
                if (bps == null) return null;
                if (bps > 0) {
                  return (
                    <span
                      className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200"
                      title={`${bps / 100}% of total supply was sent to the creator wallet at launch. The rest seeded Uniswap LP.`}
                    >
                      Creator: {bps / 100}%
                    </span>
                  );
                }
                return (
                  <span
                    className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/55"
                    title="0% creator allocation — 100% of supply went into the Uniswap pool."
                  >
                    Fair launch
                  </span>
                );
              })()}
              {launcherX && (
                <VerifiedBadge
                  handle={launcherX.handle}
                  href={launcherX.profileUrl}
                />
              )}
            </div>
            <p className="font-mono text-xs text-white/35 break-all">{address}</p>
            {instant?.createdAt && (
              <p className="mt-1 text-xs text-white/40">
                Launched {timeAgo(instant.createdAt)}
              </p>
            )}
            {dexToken?.createdAt && !instant && (
              <p className="mt-1 text-xs text-white/40">
                Created {timeAgo(dexToken.createdAt)}
              </p>
            )}
            {meta?.description && (
              <p className="mt-2 max-w-xl text-sm text-white/50">
                {meta.description}
              </p>
            )}
            {(meta?.website ||
              meta?.twitter ||
              meta?.tweet ||
              meta?.telegram ||
              meta?.discord ||
              meta?.github ||
              meta?.farcaster ||
              launcherX) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {launcherX && (
                  <SocialLink
                    href={launcherX.profileUrl}
                    label={`Verified @${launcherX.handle}`}
                    verified
                  />
                )}
                {meta?.website && (
                  <SocialLink href={meta.website} label="Website" />
                )}
                {meta?.twitter && !launcherX && (
                  <SocialLink href={meta.twitter} label="X / Twitter" />
                )}
                {meta?.tweet && (
                  <SocialLink href={meta.tweet} label="Launch tweet" />
                )}
                {meta?.telegram && (
                  <SocialLink href={meta.telegram} label="Telegram" />
                )}
                {meta?.discord && (
                  <SocialLink href={meta.discord} label="Discord" />
                )}
                {meta?.github && (
                  <SocialLink href={meta.github} label="GitHub" />
                )}
                {meta?.farcaster && (
                  <SocialLink href={meta.farcaster} label="Farcaster" />
                )}
              </div>
            )}
            {launcherX && (
              <p className="mt-2 text-[11px] text-sky-300/70">
                Launcher verified ownership of{" "}
                <a
                  href={launcherX.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  @{launcherX.handle}
                </a>{" "}
                via wallet signature + public tweet.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={tradeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#00c805] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#00e006]"
          >
            Trade on Uniswap
          </a>
          {dexscreenerUrl && (
            <a
              href={dexscreenerUrl}
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

      {loading && !curve && !instant && !dexToken && (
        <div className="hm-shimmer h-40 rounded-2xl" />
      )}

      {err && !instant && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          {err}
        </div>
      )}

      {isInstant && instant && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="LP ETH"
              value={
                instant.lpEth
                  ? `${(Number(instant.lpEth) / 1e18).toFixed(4)} ETH`
                  : "—"
              }
            />
            <Metric
              label="Max supply"
              value={
                instant.totalSupply
                  ? Number(instant.totalSupply) / 1e18 >= 1e9
                    ? `${(Number(instant.totalSupply) / 1e18 / 1e9).toFixed(0)}B`
                    : (Number(instant.totalSupply) / 1e18).toLocaleString()
                  : "—"
              }
            />
            <Metric
              label="Creator alloc"
              value={
                typeof instant.creatorBps === "number"
                  ? instant.creatorBps === 0
                    ? "0% fair"
                    : `${instant.creatorBps / 100}%`
                  : meta?.creatorBps != null
                    ? `${meta.creatorBps / 100}%`
                    : "—"
              }
            />
            <Metric
              label="LP"
              value={instant.lpBurned ? "Burned 🔥" : "Creator holds"}
            />
          </div>
          {typeof instant.creatorBps === "number" && (
            <p className="text-[11px] leading-relaxed text-white/35">
              {instant.creatorBps === 0
                ? "Fair launch: 100% of supply seeded the Uniswap pool. Creator received no free tokens at launch."
                : `At launch, ${instant.creatorBps / 100}% of supply went to the creator wallet. The remaining ${100 - instant.creatorBps / 100}% was paired with ETH on Uniswap.`}
            </p>
          )}
        </>
      )}

      {isCurve && curve ? (
        <CurveStats curve={curve} />
      ) : dexToken && !isInstant ? (
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
          {chartSrc ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <div className="border-b border-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                DexScreener · Uniswap pair
              </div>
              <iframe
                title={`${symbol} chart`}
                src={chartSrc}
                className="h-[420px] w-full"
              />
            </div>
          ) : isCurve && curve ? (
            <>
              <CurveChart curve={curve} />
              <RecentTrades curve={curve} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-white/40">
              {loading
                ? "Loading market…"
                : isInstant
                  ? "Pair is live on Uniswap. DexScreener embed appears once indexed — use Trade on Uniswap / DexScreener links above."
                  : "No HoodMemes launch or DexScreener pair found for this address."}
            </div>
          )}

          {isInstant && (
            <div className="rounded-xl border border-[#00c805]/20 bg-[#00c805]/5 px-4 py-3 text-xs text-[#b8f5b8]">
              Instant Uniswap launch — 100% of fixed supply seeded as LP.
              {instant?.lpBurned
                ? " LP burned (locked forever)."
                : " Creator holds LP (can remove liquidity)."}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {isInstant ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">
                Trade
              </h2>
              <p className="text-xs text-white/45">
                This token trades on Uniswap V2 — not a bonding curve.
              </p>
              <a
                href={tradeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center rounded-xl bg-[#00c805] py-3 text-sm font-bold text-black hover:bg-[#00e006]"
              >
                Open Uniswap
              </a>
              {dexscreenerUrl && (
                <a
                  href={dexscreenerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center rounded-xl border border-white/15 py-3 text-sm text-white/80 hover:bg-white/5"
                >
                  Open DexScreener
                </a>
              )}
            </div>
          ) : (
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
          )}
        </div>
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

function SocialLink({
  href,
  label,
  verified,
}: {
  href: string;
  label: string;
  verified?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        verified
          ? "rounded-lg border border-sky-500/35 bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-200 transition hover:border-sky-400/50"
          : "rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:border-[#00c805]/40 hover:text-[#00c805]"
      }
    >
      {label} ↗
    </a>
  );
}
