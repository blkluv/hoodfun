"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import type { Address } from "viem";
import type { CurveSnapshot } from "@/lib/curve";
import type { TokenCardData } from "@/lib/types";
import { CurveChart, CurveStats, RecentTrades } from "./CurveChart";
import { TokenTradeSection } from "./TokenTradeSection";
import {
  formatPct,
  formatPrice,
  formatSupply,
  formatUsd,
  shortAddr,
  timeAgo,
} from "@/lib/format";
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
  creatorBps?: number;
  createdAt?: number;
  name: string;
  symbol: string;
};

type LiveStats = TokenCardData | null;

export function TokenPageClient({
  address,
  marketHint,
  pairHint,
  dexToken,
  initialSymbol,
  initialName,
}: {
  address: string;
  marketHint?: string | null;
  pairHint?: string | null;
  dexToken: TokenCardData | null;
  initialSymbol?: string | null;
  initialName?: string | null;
}) {
  const [curve, setCurve] = useState<CurveSnapshot | null>(null);
  const [instant, setInstant] = useState<InstantLaunch | null>(null);
  const [live, setLive] = useState<LiveStats>(dexToken);
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
    name?: string;
    symbol?: string;
  } | null>(null);
  const [launcherX, setLauncherX] = useState<{
    handle: string;
    profileUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chartTab, setChartTab] = useState<"chart" | "txns">("chart");

  const loadLauncherVerify = useCallback(
    async (creatorAddr: string | undefined | null) => {
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
    },
    []
  );

  const refreshDex = useCallback(async () => {
    try {
      const pairQ = pairHint ? `&pair=${pairHint}` : "";
      const res = await fetch(`/api/tokens?address=${address}${pairQ}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.token) setLive(data.token as TokenCardData);
        else if (data?.address) setLive(data as TokenCardData);
      }
    } catch {
      /* keep last */
    }
  }, [address, pairHint]);

  const load = useCallback(async () => {
    try {
      fetch(`/api/launch-meta?token=${address}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.meta) {
            setMeta(d.meta);
            if (d.meta.creator) loadLauncherVerify(d.meta.creator);
          }
        })
        .catch(() => null);

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
    refreshDex();
    const id = setInterval(() => {
      load();
      refreshDex();
    }, 15_000);
    return () => clearInterval(id);
  }, [load, refreshDex]);

  const isCurve = !!curve && !instant;
  const isInstant = !!instant;
  const stats = live ?? dexToken;

  const symbol = (
    instant?.symbol ||
    stats?.symbol ||
    meta?.symbol ||
    initialSymbol ||
    curve?.symbol ||
    "TOKEN"
  ).toUpperCase();

  const name =
    instant?.name ||
    stats?.name ||
    meta?.name ||
    initialName ||
    curve?.name ||
    shortAddr(address);

  // Keep Chrome tab in sync when client resolves ticker
  useEffect(() => {
    if (symbol && symbol !== "TOKEN") {
      document.title = `$${symbol}${name && name !== symbol ? ` · ${name}` : ""} | HoodMemes`;
    }
  }, [symbol, name]);

  const explorer = `${ROBINHOOD_CHAIN.blockExplorers.default.url}/token/${address}`;
  const tradeUrl = `${UNISWAP_APP}/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${address}`;

  const pairAddress =
    pairHint ||
    instant?.pair ||
    curve?.uniswapPair ||
    stats?.pairAddress ||
    dexToken?.pairAddress ||
    null;

  const chartSrc = pairAddress
    ? `https://dexscreener.com/robinhood/${pairAddress}?embed=1&theme=dark&trades=0&info=0`
    : null;

  const dexscreenerUrl = pairAddress
    ? `https://dexscreener.com/robinhood/${pairAddress}`
    : stats?.dexscreenerUrl;

  const chg24 = stats?.priceChange24h ?? null;
  const chg1h = stats?.priceChange1h ?? null;
  const chg5m = stats?.priceChange5m ?? null;
  const up24 = (chg24 ?? 0) >= 0;
  const up1h = (chg1h ?? 0) >= 0;

  const buys = stats?.buys24h ?? 0;
  const sells = stats?.sells24h ?? 0;
  const totalTx = buys + sells || 1;
  const buyPct = Math.round((buys / totalTx) * 100);

  const creatorBps =
    typeof instant?.creatorBps === "number"
      ? instant.creatorBps
      : typeof meta?.creatorBps === "number"
        ? meta.creatorBps
        : null;

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://hoodmemes.fun/token/${address}`;

  async function copyCa() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function share() {
    const text = `$${symbol} on Robinhood Chain · HoodMemes\n${shareUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `$${symbol}`, text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* ignore */
    }
  }

  const launchedAgo = useMemo(() => {
    if (instant?.createdAt) return timeAgo(instant.createdAt);
    if (stats?.createdAt) return timeAgo(stats.createdAt);
    return null;
  }, [instant?.createdAt, stats?.createdAt]);

  return (
    <div className="relative pb-24 sm:pb-8">
      {/* Ambient */}
      <div className="pointer-events-none absolute -left-20 -top-10 h-56 w-56 rounded-full bg-[#00c805]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-40 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative space-y-5 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/45 transition hover:text-[#00c805]"
          >
            <span aria-hidden>←</span> Board
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            {launchedAgo && <span>Launched {launchedAgo}</span>}
            {isInstant && (
              <>
                <span className="text-white/15">·</span>
                <span className="text-[#00c805]/80">Uniswap live</span>
              </>
            )}
          </div>
        </div>

        {/* ── Hero ── */}
        <section className="hm-glass overflow-hidden rounded-3xl p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              <div className="relative shrink-0">
                {stats?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={stats.imageUrl}
                    alt={symbol}
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-[#00c805]/30 sm:h-20 sm:w-20"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00c805]/35 to-emerald-950 text-3xl font-black text-[#00c805] ring-2 ring-[#00c805]/30 sm:h-20 sm:w-20">
                    {symbol[0] || "?"}
                  </div>
                )}
                <span className="hm-live-dot absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0f0c] bg-[#00c805]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    ${symbol}
                  </h1>
                  {name && name !== symbol && (
                    <span className="truncate text-sm text-white/40 sm:text-base">
                      {name}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {isInstant && (
                    <Pill tone="green">Uniswap V2</Pill>
                  )}
                  {isCurve && <Pill tone="green">Bonding curve</Pill>}
                  {instant?.lpBurned && <Pill tone="muted">LP burned 🔥</Pill>}
                  {creatorBps != null && creatorBps > 0 && (
                    <Pill tone="amber">Creator {creatorBps / 100}%</Pill>
                  )}
                  {creatorBps === 0 && <Pill tone="muted">Fair launch</Pill>}
                  {launcherX && (
                    <VerifiedBadge
                      handle={launcherX.handle}
                      href={launcherX.profileUrl}
                      size="sm"
                    />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={copyCa}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-white/55 transition hover:border-[#00c805]/40 hover:text-white"
                    title="Copy contract address"
                  >
                    {shortAddr(address, 6)}
                    <span className="text-[10px] font-sans font-bold text-[#00c805]/80">
                      {copied ? "Copied" : "CA"}
                    </span>
                  </button>
                  {pairAddress && (
                    <span className="hidden font-mono text-[10px] text-white/25 sm:inline">
                      pair {shortAddr(pairAddress, 4)}
                    </span>
                  )}
                </div>

                {(meta?.description || launcherX) && (
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                    {meta?.description}
                    {launcherX && !meta?.description && (
                      <>
                        Verified launcher{" "}
                        <a
                          href={launcherX.profileUrl}
                          className="font-semibold text-sky-300 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          @{launcherX.handle}
                        </a>
                      </>
                    )}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {launcherX && (
                    <SocialChip
                      href={launcherX.profileUrl}
                      label={`@${launcherX.handle}`}
                      tone="sky"
                    />
                  )}
                  {meta?.website && (
                    <SocialChip href={meta.website} label="Website" />
                  )}
                  {meta?.twitter && !launcherX && (
                    <SocialChip href={meta.twitter} label="X" />
                  )}
                  {meta?.tweet && (
                    <SocialChip href={meta.tweet} label="Launch tweet" />
                  )}
                  {meta?.telegram && (
                    <SocialChip href={meta.telegram} label="Telegram" />
                  )}
                  {meta?.discord && (
                    <SocialChip href={meta.discord} label="Discord" />
                  )}
                  {meta?.github && (
                    <SocialChip href={meta.github} label="GitHub" />
                  )}
                  {meta?.farcaster && (
                    <SocialChip href={meta.farcaster} label="Farcaster" />
                  )}
                </div>
              </div>
            </div>

            {/* Price block */}
            <div className="shrink-0 rounded-2xl border border-white/8 bg-black/35 px-4 py-3 sm:min-w-[200px] sm:px-5 sm:py-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                Price
              </div>
              <div className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">
                {formatPrice(stats?.priceUsd)}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold tabular-nums">
                <span className={up1h ? "text-[#00c805]" : "text-rose-400"}>
                  1h {formatPct(chg1h)}
                </span>
                <span className="text-white/20">·</span>
                <span className={up24 ? "text-[#00c805]" : "text-rose-400"}>
                  24h {formatPct(chg24)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={tradeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#00c805] px-4 py-2.5 text-sm font-black text-black shadow-[0_0_24px_rgba(0,200,5,0.25)] hover:bg-[#00e006]"
                >
                  Buy
                </a>
                <button
                  type="button"
                  onClick={share}
                  className="rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/5"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats strip ── */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label="Market cap"
            value={formatUsd(stats?.marketCap)}
            big
          />
          <Stat label="Liquidity" value={formatUsd(stats?.liquidity)} />
          <Stat label="Vol 24h" value={formatUsd(stats?.volume24h)} />
          <Stat label="Vol 1h" value={formatUsd(stats?.volume1h)} />
          <Stat
            label="Txns 24h"
            value={
              stats?.txns24h != null
                ? String(stats.txns24h)
                : buys || sells
                  ? String(buys + sells)
                  : "—"
            }
          />
          <Stat
            label="5m"
            value={formatPct(chg5m)}
            accent={(chg5m ?? 0) >= 0 ? "up" : "down"}
          />
        </section>

        {/* Buy/sell pressure */}
        {(buys > 0 || sells > 0) && (
          <section className="hm-glass rounded-2xl px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-white/40">24h flow</span>
              <span className="tabular-nums text-white/60">
                <span className="text-[#00c805]">{buys} buys</span>
                <span className="mx-1.5 text-white/20">/</span>
                <span className="text-rose-400">{sells} sells</span>
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-rose-500/30">
              <div
                className="bg-[#00c805] transition-all"
                style={{ width: `${buyPct}%` }}
              />
            </div>
          </section>
        )}

        {loading && !stats && !instant && !curve && (
          <div className="hm-shimmer h-48 rounded-3xl" />
        )}

        {err && !instant && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            {err}
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {/* Chart */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between border-b border-white/8 px-3 py-2 sm:px-4">
                <div className="flex gap-1 rounded-lg bg-black/40 p-0.5">
                  <TabBtn
                    active={chartTab === "chart"}
                    onClick={() => setChartTab("chart")}
                  >
                    Chart
                  </TabBtn>
                  <TabBtn
                    active={chartTab === "txns"}
                    onClick={() => setChartTab("txns")}
                  >
                    Activity
                  </TabBtn>
                </div>
                <div className="flex gap-2">
                  {dexscreenerUrl && (
                    <a
                      href={dexscreenerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-[#00c805]"
                    >
                      DexScreener ↗
                    </a>
                  )}
                </div>
              </div>

              {chartTab === "chart" ? (
                chartSrc ? (
                  <iframe
                    title={`${symbol} chart`}
                    src={chartSrc}
                    className="h-[380px] w-full sm:h-[480px] lg:h-[520px]"
                  />
                ) : isCurve && curve ? (
                  <div className="p-3">
                    <CurveChart curve={curve} />
                  </div>
                ) : (
                  <div className="flex h-[280px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white/40">
                    {loading
                      ? "Loading chart…"
                      : "Waiting for DexScreener index — pair is live on Uniswap."}
                    {pairAddress && (
                      <a
                        href={`https://dexscreener.com/robinhood/${pairAddress}`}
                        className="text-xs font-semibold text-[#00c805]"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open pair on DexScreener ↗
                      </a>
                    )}
                  </div>
                )
              ) : isCurve && curve ? (
                <div className="p-3">
                  <RecentTrades curve={curve} />
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Mini label="5m" value={formatPct(stats?.priceChange5m)} />
                    <Mini label="1h" value={formatPct(stats?.priceChange1h)} />
                    <Mini label="6h" value={formatPct(stats?.priceChange6h)} />
                    <Mini label="24h" value={formatPct(stats?.priceChange24h)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Mini
                      label="Buys 24h"
                      value={stats?.buys24h != null ? String(stats.buys24h) : "—"}
                    />
                    <Mini
                      label="Sells 24h"
                      value={
                        stats?.sells24h != null ? String(stats.sells24h) : "—"
                      }
                    />
                  </div>
                  <p className="text-[11px] text-white/35">
                    Live trade tape is on DexScreener. Stats refresh every 15s.
                  </p>
                </div>
              )}
            </div>

            {/* Launch details */}
            {(isInstant || isCurve) && (
              <section className="hm-glass rounded-3xl p-4 sm:p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">
                  Launch details
                </h2>
                {isInstant && instant && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Detail
                      k="Supply"
                      v={formatSupply(instant.totalSupply)}
                    />
                    <Detail
                      k="LP ETH"
                      v={
                        instant.lpEth
                          ? `${(Number(instant.lpEth) / 1e18).toFixed(4)} ETH`
                          : "—"
                      }
                    />
                    <Detail
                      k="Creator alloc"
                      v={
                        creatorBps == null
                          ? "—"
                          : creatorBps === 0
                            ? "0% fair launch"
                            : `${creatorBps / 100}% to creator`
                      }
                    />
                    <Detail
                      k="LP tokens"
                      v={instant.lpBurned ? "Burned (locked)" : "Creator holds"}
                    />
                    <Detail
                      k="Creator"
                      v={shortAddr(instant.creator, 6)}
                      mono
                      href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${instant.creator}`}
                    />
                    <Detail
                      k="Pair"
                      v={shortAddr(instant.pair, 6)}
                      mono
                      href={
                        dexscreenerUrl ||
                        `${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${instant.pair}`
                      }
                    />
                  </div>
                )}
                {isCurve && curve && (
                  <div className="mt-3">
                    <CurveStats curve={curve} />
                  </div>
                )}
                {isInstant && creatorBps != null && (
                  <p className="mt-3 text-[11px] leading-relaxed text-white/35">
                    {creatorBps === 0
                      ? "Fair launch: 100% of supply seeded the Uniswap pool. Creator got no free tokens at mint."
                      : `At launch, ${creatorBps / 100}% of supply went to the creator wallet. ${100 - creatorBps / 100}% was paired with ETH on Uniswap.`}
                  </p>
                )}
              </section>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {isInstant ? (
              <div className="hm-glass-green rounded-3xl p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#00c805]/80">
                  Trade ${symbol}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/50">
                  Instant Uniswap V2 pool — swap ETH for ${symbol} on Robinhood
                  Chain.
                </p>
                <a
                  href={tradeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#00c805] py-3.5 text-sm font-black text-black shadow-[0_0_28px_rgba(0,200,5,0.35)] hover:bg-[#00e006]"
                >
                  Open Uniswap
                </a>
                {dexscreenerUrl && (
                  <a
                    href={dexscreenerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex w-full items-center justify-center rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
                  >
                    DexScreener
                  </a>
                )}
                <a
                  href={explorer}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex w-full items-center justify-center rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-white/45 hover:text-white/70"
                >
                  Block explorer
                </a>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="h-64 animate-pulse rounded-3xl bg-white/5" />
                }
              >
                <TokenTradeSection
                  tokenAddress={address}
                  symbol={symbol}
                  marketHint={
                    (marketHint || curve?.market) as Address | undefined
                  }
                />
              </Suspense>
            )}

            <div className="hm-glass rounded-3xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                Quick links
              </div>
              <div className="mt-3 space-y-1.5">
                <QuickLink href={tradeUrl} label="Uniswap swap" />
                {dexscreenerUrl && (
                  <QuickLink href={dexscreenerUrl} label="DexScreener chart" />
                )}
                <QuickLink href={explorer} label="Token on explorer" />
                {pairAddress && (
                  <QuickLink
                    href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${pairAddress}`}
                    label="Pair contract"
                  />
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050806]/95 p-3 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-black text-white">
              ${symbol}
            </div>
            <div className="truncate text-[11px] tabular-nums text-white/50">
              {formatPrice(stats?.priceUsd)}{" "}
              <span className={up24 ? "text-[#00c805]" : "text-rose-400"}>
                {formatPct(chg24)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={copyCa}
            className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-white/70"
          >
            {copied ? "✓" : "CA"}
          </button>
          <a
            href={tradeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#00c805] px-5 py-2.5 text-sm font-black text-black"
          >
            Buy
          </a>
        </div>
      </div>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "amber" | "muted";
}) {
  const cls =
    tone === "green"
      ? "bg-[#00c805]/15 text-[#00c805] ring-[#00c805]/25"
      : tone === "amber"
        ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
        : "bg-white/8 text-white/55 ring-white/10";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  accent,
  big,
}: {
  label: string;
  value: string;
  accent?: "up" | "down";
  big?: boolean;
}) {
  const color =
    accent === "up"
      ? "text-[#00c805]"
      : accent === "down"
        ? "text-rose-400"
        : "text-white";
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 sm:px-4">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-white/35">
        {label}
      </div>
      <div
        className={`mt-0.5 font-black tabular-nums ${color} ${
          big ? "text-base sm:text-lg" : "text-sm sm:text-base"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-white/35">
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums text-white/90">{value}</div>
    </div>
  );
}

function Detail({
  k,
  v,
  mono,
  href,
}: {
  k: string;
  v: string;
  mono?: boolean;
  href?: string;
}) {
  const val = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`font-semibold text-[#00c805]/90 hover:underline ${mono ? "font-mono text-xs" : ""}`}
    >
      {v}
    </a>
  ) : (
    <span className={`font-semibold text-white/85 ${mono ? "font-mono text-xs" : ""}`}>
      {v}
    </span>
  );
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-black/30 px-3 py-2.5 text-sm">
      <span className="text-white/40">{k}</span>
      {val}
    </div>
  );
}

function SocialChip({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone?: "sky";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        tone === "sky"
          ? "rounded-lg border border-sky-500/35 bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-200 hover:border-sky-400/50"
          : "rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:border-[#00c805]/40 hover:text-[#00c805]"
      }
    >
      {label} ↗
    </a>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
    >
      <span>{label}</span>
      <span className="text-white/25">↗</span>
    </a>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
        active
          ? "bg-[#00c805] text-black"
          : "text-white/40 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}
