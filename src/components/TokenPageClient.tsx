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

type Related = Pick<
  TokenCardData,
  "address" | "symbol" | "name" | "marketCap" | "priceChange24h" | "imageUrl"
>;

const QUICK_ETH = ["0.01", "0.05", "0.1", "0.25"] as const;

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
  const [live, setLive] = useState<TokenCardData | null>(dexToken);
  const [related, setRelated] = useState<Related[]>([]);
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
  const [copied, setCopied] = useState<"ca" | "pair" | "share" | null>(null);
  const [mainTab, setMainTab] = useState<"chart" | "trades" | "info">("chart");
  const [ethIn, setEthIn] = useState("0.05");
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

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
        } else setLauncherX(null);
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
      }
      setLastRefresh(Date.now());
    } catch {
      /* keep */
    }
  }, [address, pairHint]);

  const loadRelated = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens?tab=trending");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.tokens || data || []) as TokenCardData[];
      setRelated(
        list
          .filter((t) => t.address?.toLowerCase() !== address.toLowerCase())
          .slice(0, 6)
          .map((t) => ({
            address: t.address,
            symbol: t.symbol,
            name: t.name,
            marketCap: t.marketCap,
            priceChange24h: t.priceChange24h,
            imageUrl: t.imageUrl,
          }))
      );
    } catch {
      /* ignore */
    }
  }, [address]);

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
    loadRelated();
    const id = setInterval(() => {
      load();
      refreshDex();
    }, 12_000);
    return () => clearInterval(id);
  }, [load, refreshDex, loadRelated]);

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

  useEffect(() => {
    if (symbol && symbol !== "TOKEN") {
      document.title = `$${symbol}${name && name !== symbol ? ` · ${name}` : ""} | HoodMemes`;
    }
  }, [symbol, name]);

  const explorer = `${ROBINHOOD_CHAIN.blockExplorers.default.url}/token/${address}`;
  const creatorExplorer = (c: string) =>
    `${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${c}`;

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
  const tradesSrc = pairAddress
    ? `https://dexscreener.com/robinhood/${pairAddress}?embed=1&theme=dark&trades=1&info=0&chartLeftToolbar=0`
    : null;

  const dexscreenerUrl = pairAddress
    ? `https://dexscreener.com/robinhood/${pairAddress}`
    : stats?.dexscreenerUrl;

  const tradeUrl = (eth?: string) => {
    const base = `${UNISWAP_APP}/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${address}`;
    if (eth) return `${base}&value=${eth}`;
    return base;
  };

  const chg = {
    m5: stats?.priceChange5m ?? null,
    h1: stats?.priceChange1h ?? null,
    h6: stats?.priceChange6h ?? null,
    h24: stats?.priceChange24h ?? null,
  };
  const up24 = (chg.h24 ?? 0) >= 0;

  const buys24 = stats?.buys24h ?? 0;
  const sells24 = stats?.sells24h ?? 0;
  const total24 = buys24 + sells24 || 1;
  const buyPct24 = Math.round((buys24 / total24) * 100);

  const buys1h = stats?.buys1h ?? 0;
  const sells1h = stats?.sells1h ?? 0;
  const total1h = buys1h + sells1h || 1;
  const buyPct1h = Math.round((buys1h / total1h) * 100);

  const creatorBps =
    typeof instant?.creatorBps === "number"
      ? instant.creatorBps
      : typeof meta?.creatorBps === "number"
        ? meta.creatorBps
        : null;

  const lpPoolPct = creatorBps != null ? 100 - creatorBps / 100 : null;

  async function copy(text: string, kind: "ca" | "pair" | "share") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      /* ignore */
    }
  }

  const socials = useMemo(() => {
    const items: { href: string; label: string; tone?: "sky" }[] = [];
    if (launcherX)
      items.push({
        href: launcherX.profileUrl,
        label: `@${launcherX.handle}`,
        tone: "sky",
      });
    if (meta?.website) items.push({ href: meta.website, label: "Website" });
    if (meta?.twitter && !launcherX)
      items.push({ href: meta.twitter, label: "X / Twitter" });
    if (meta?.tweet) items.push({ href: meta.tweet, label: "Launch tweet" });
    if (meta?.telegram) items.push({ href: meta.telegram, label: "Telegram" });
    if (meta?.discord) items.push({ href: meta.discord, label: "Discord" });
    if (meta?.github) items.push({ href: meta.github, label: "GitHub" });
    if (meta?.farcaster)
      items.push({ href: meta.farcaster, label: "Farcaster" });
    return items;
  }, [meta, launcherX]);

  const age = instant?.createdAt
    ? timeAgo(instant.createdAt)
    : stats?.createdAt
      ? timeAgo(stats.createdAt)
      : null;

  return (
    <div className="relative -mx-4 min-h-[70vh] bg-[#050806] sm:mx-0">
      {/* ═══ TOP TICKER BAR ═══ */}
      <div className="sticky top-14 z-30 border-b border-white/10 bg-[#070b08]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link
            href="/"
            className="text-xs text-white/40 hover:text-[#00c805]"
          >
            ← Board
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            {stats?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stats.imageUrl}
                alt=""
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-white/15"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00c805]/20 text-xs font-black text-[#00c805]">
                {symbol[0]}
              </div>
            )}
            <span className="text-sm font-black text-white">${symbol}</span>
            {name !== symbol && (
              <span className="hidden truncate text-xs text-white/35 sm:inline max-w-[120px]">
                {name}
              </span>
            )}
          </div>
          <div className="font-mono text-sm font-black tabular-nums text-white">
            {formatPrice(stats?.priceUsd)}
          </div>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
              up24
                ? "bg-[#00c805]/15 text-[#00c805]"
                : "bg-rose-500/15 text-rose-400"
            }`}
          >
            24h {formatPct(chg.h24)}
          </span>
          <div className="hidden items-center gap-3 text-[11px] text-white/40 md:flex">
            <span>
              MCap{" "}
              <strong className="text-white/75">
                {formatUsd(stats?.marketCap)}
              </strong>
            </span>
            <span>
              Liq{" "}
              <strong className="text-white/75">
                {formatUsd(stats?.liquidity)}
              </strong>
            </span>
            <span>
              Vol{" "}
              <strong className="text-white/75">
                {formatUsd(stats?.volume24h)}
              </strong>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[10px] text-white/25 sm:inline">
              live · {new Date(lastRefresh).toLocaleTimeString()}
            </span>
            <a
              href={tradeUrl()}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#00c805] px-3 py-1.5 text-xs font-black text-black hover:bg-[#00e006]"
            >
              Buy ${symbol}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-5">
        {/* Risk banners */}
        {(creatorBps != null && creatorBps >= 500) ||
        (isInstant && instant && !instant.lpBurned) ? (
          <div className="mb-4 space-y-2">
            {isInstant && instant && !instant.lpBurned && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-100">
                LP not burned — creator can remove liquidity. Trade carefully.
              </div>
            )}
            {creatorBps != null && creatorBps >= 500 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-100">
                Creator allocation {creatorBps / 100}% at launch — check tokenomics
                before size.
              </div>
            )}
          </div>
        ) : null}

        {/* ═══ HEADER ═══ */}
        <header className="mb-4 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="flex gap-4">
            <div className="relative shrink-0">
              {stats?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stats.imageUrl}
                  alt={symbol}
                  className="h-[72px] w-[72px] rounded-2xl object-cover shadow-[0_0_40px_rgba(0,200,5,0.2)] ring-2 ring-[#00c805]/35 sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#00c805]/40 via-emerald-900 to-black text-3xl font-black text-[#00c805] ring-2 ring-[#00c805]/35 sm:h-20 sm:w-20">
                  {symbol[0]}
                </div>
              )}
              <span className="hm-live-dot absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#050806] bg-[#00c805]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  ${symbol}
                </h1>
                <span className="text-base text-white/40">{name}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {isInstant && <Badge green>Uniswap V2</Badge>}
                {isCurve && <Badge green>Bonding curve</Badge>}
                {instant?.lpBurned && <Badge>LP burned 🔥</Badge>}
                {!instant?.lpBurned && isInstant && (
                  <Badge warn>LP not burned</Badge>
                )}
                {creatorBps === 0 && <Badge>Fair launch</Badge>}
                {creatorBps != null && creatorBps > 0 && (
                  <Badge warn>Creator {creatorBps / 100}%</Badge>
                )}
                {age && <Badge>Age {age}</Badge>}
                {stats?.dexId && <Badge>{stats.dexId}</Badge>}
                {launcherX && (
                  <VerifiedBadge
                    handle={launcherX.handle}
                    href={launcherX.profileUrl}
                    size="sm"
                  />
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <CopyBtn
                  label={copied === "ca" ? "Copied CA" : shortAddr(address, 6)}
                  onClick={() => copy(address, "ca")}
                />
                {pairAddress && (
                  <CopyBtn
                    label={
                      copied === "pair"
                        ? "Copied pair"
                        : `pair ${shortAddr(pairAddress, 4)}`
                    }
                    onClick={() => copy(pairAddress, "pair")}
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    copy(
                      `$${symbol} on Robinhood · https://hoodmemes.fun/token/${address}`,
                      "share"
                    )
                  }
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/55 hover:border-[#00c805]/40 hover:text-white"
                >
                  {copied === "share" ? "Link copied" : "Share"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const eth = (
                        window as unknown as {
                          ethereum?: {
                            request: (a: {
                              method: string;
                              params?: unknown;
                            }) => Promise<unknown>;
                          };
                        }
                      ).ethereum;
                      if (!eth) return;
                      await eth.request({
                        method: "wallet_watchAsset",
                        params: {
                          type: "ERC20",
                          options: {
                            address,
                            symbol: symbol.slice(0, 11),
                            decimals: 18,
                            image: stats?.imageUrl || undefined,
                          },
                        },
                      });
                    } catch {
                      /* user rejected */
                    }
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/55 hover:border-[#00c805]/40 hover:text-white"
                >
                  + Wallet
                </button>
              </div>
              {meta?.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
                  {meta.description}
                </p>
              )}
              {socials.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {socials.map((s) => (
                    <a
                      key={s.href + s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className={
                        s.tone === "sky"
                          ? "rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200"
                          : "rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/65 hover:border-[#00c805]/40 hover:text-[#00c805]"
                      }
                    >
                      {s.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price panel */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent px-5 py-4 sm:min-w-[240px]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                Last price
              </div>
              <div className="mt-1 text-3xl font-black tabular-nums tracking-tight text-white">
                {formatPrice(stats?.priceUsd)}
              </div>
              {stats?.priceNative != null && (
                <div className="mt-0.5 font-mono text-[11px] text-white/35">
                  {stats.priceNative < 1e-9
                    ? stats.priceNative.toExponential(3)
                    : stats.priceNative.toPrecision(4)}{" "}
                  {stats.quoteSymbol || "ETH"}
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1">
              {(
                [
                  ["5m", chg.m5],
                  ["1h", chg.h1],
                  ["6h", chg.h6],
                  ["24h", chg.h24],
                ] as const
              ).map(([lab, v]) => (
                <div
                  key={lab}
                  className="rounded-lg bg-black/40 px-1.5 py-1.5 text-center"
                >
                  <div className="text-[9px] text-white/35">{lab}</div>
                  <div
                    className={`text-[11px] font-bold tabular-nums ${
                      (v ?? 0) >= 0 ? "text-[#00c805]" : "text-rose-400"
                    }`}
                  >
                    {formatPct(v)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ═══ KEY METRICS GRID ═══ */}
        <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Market cap" value={formatUsd(stats?.marketCap)} />
          <MetricCard
            label="FDV"
            value={formatUsd(stats?.fdv ?? stats?.marketCap)}
          />
          <MetricCard label="Liquidity" value={formatUsd(stats?.liquidity)} />
          <MetricCard label="Vol 24h" value={formatUsd(stats?.volume24h)} />
          <MetricCard label="Vol 1h" value={formatUsd(stats?.volume1h)} />
          <MetricCard label="Vol 6h" value={formatUsd(stats?.volume6h)} />
          <MetricCard
            label="Txns 24h"
            value={
              stats?.txns24h != null
                ? String(stats.txns24h)
                : buys24 || sells24
                  ? String(buys24 + sells24)
                  : "—"
            }
          />
          <MetricCard
            label="Buy / sell 24h"
            value={`${buys24} / ${sells24}`}
          />
        </section>

        {loading && !stats && !instant && (
          <div className="hm-shimmer mb-4 h-40 rounded-2xl" />
        )}
        {err && !instant && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            {err}
          </div>
        )}

        {/* ═══ MAIN 3-COL TERMINAL ═══ */}
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          {/* LEFT rail */}
          <aside className="order-2 space-y-3 xl:order-1">
            {/* Flow */}
            <Panel title="Order flow">
              <FlowBar
                label="1h"
                buys={buys1h}
                sells={sells1h}
                pct={buyPct1h}
              />
              <FlowBar
                label="24h"
                buys={buys24}
                sells={sells24}
                pct={buyPct24}
              />
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <MiniStat label="Buys 5m" value={String(stats?.buys5m ?? 0)} up />
                <MiniStat
                  label="Sells 5m"
                  value={String(stats?.sells5m ?? 0)}
                  down
                />
                <MiniStat label="Vol 5m" value={formatUsd(stats?.volume5m)} />
                <MiniStat
                  label="Vol 1h"
                  value={formatUsd(stats?.volume1h)}
                />
              </div>
            </Panel>

            {/* Liquidity */}
            <Panel title="Liquidity pool">
              <Row k="USD value" v={formatUsd(stats?.liquidity)} />
              <Row
                k={`Base ($${symbol})`}
                v={
                  stats?.liquidityBase != null
                    ? compactQty(stats.liquidityBase)
                    : "—"
                }
              />
              <Row
                k={`Quote (${stats?.quoteSymbol || "WETH"})`}
                v={
                  stats?.liquidityQuote != null
                    ? `${Number(stats.liquidityQuote).toPrecision(4)}`
                    : "—"
                }
              />
              <Row k="DEX" v={stats?.dexId ? stats.dexId.toUpperCase() : "—"} />
              <Row
                k="Pair"
                v={pairAddress ? shortAddr(pairAddress, 5) : "—"}
                mono
              />
              {instant?.lpBurned != null && (
                <Row
                  k="LP ownership"
                  v={instant.lpBurned ? "Burned 🔥" : "Creator holds"}
                  accent={instant.lpBurned ? "green" : "warn"}
                />
              )}
            </Panel>

            {/* Launch / tokenomics */}
            <Panel title="Tokenomics">
              {isInstant && instant ? (
                <>
                  <Row
                    k="Total supply"
                    v={formatSupply(instant.totalSupply)}
                  />
                  <Row
                    k="Creator allocation"
                    v={
                      creatorBps == null
                        ? "—"
                        : creatorBps === 0
                          ? "0% (fair)"
                          : `${creatorBps / 100}%`
                    }
                    accent={
                      creatorBps === 0
                        ? "green"
                        : creatorBps && creatorBps >= 500
                          ? "warn"
                          : undefined
                    }
                  />
                  <Row
                    k="In LP at launch"
                    v={lpPoolPct != null ? `${lpPoolPct}%` : "—"}
                  />
                  <Row
                    k="Seed LP"
                    v={
                      instant.lpEth
                        ? `${(Number(instant.lpEth) / 1e18).toFixed(4)} ETH`
                        : "—"
                    }
                  />
                  <Row
                    k="Creator wallet"
                    v={shortAddr(instant.creator, 5)}
                    mono
                    href={creatorExplorer(instant.creator)}
                  />
                  <Row
                    k="Launched"
                    v={
                      instant.createdAt
                        ? new Date(instant.createdAt).toLocaleString()
                        : "—"
                    }
                  />
                </>
              ) : isCurve && curve ? (
                <div className="-mx-1">
                  <CurveStats curve={curve} />
                </div>
              ) : (
                <>
                  <Row k="Supply" v="See explorer" />
                  <Row k="Type" v="External / indexed pair" />
                </>
              )}
              {creatorBps != null && (
                <p className="mt-2 text-[10px] leading-relaxed text-white/35">
                  {creatorBps === 0
                    ? "Fair launch: 100% of supply went into the Uniswap pool at mint. No free creator bag."
                    : `${creatorBps / 100}% of supply was sent to the creator wallet; ${lpPoolPct}% paired with ETH.`}
                </p>
              )}
            </Panel>

            {/* Contracts */}
            <Panel title="Contracts">
              <ContractRow
                label="Token"
                addr={address}
                href={explorer}
                onCopy={() => copy(address, "ca")}
              />
              {pairAddress && (
                <ContractRow
                  label="Pair"
                  addr={pairAddress}
                  href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${pairAddress}`}
                  onCopy={() => copy(pairAddress, "pair")}
                />
              )}
              {instant?.creator && (
                <ContractRow
                  label="Creator"
                  addr={instant.creator}
                  href={creatorExplorer(instant.creator)}
                />
              )}
              <div className="mt-2 rounded-lg border border-white/8 bg-black/30 px-2.5 py-2 text-[10px] leading-relaxed text-white/35">
                Chain: Robinhood ({ROBINHOOD_CHAIN.id}) · Always verify CA
                before buying. HoodMemes is not financial advice.
              </div>
            </Panel>
          </aside>

          {/* CENTER — chart */}
          <section className="order-1 min-w-0 xl:order-2">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f0c] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
                <div className="flex gap-0.5 rounded-lg bg-black/50 p-0.5">
                  {(
                    [
                      ["chart", "Chart"],
                      ["trades", "Trades"],
                      ["info", "About"],
                    ] as const
                  ).map(([id, lab]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMainTab(id)}
                      className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                        mainTab === id
                          ? "bg-[#00c805] text-black"
                          : "text-white/40 hover:text-white/75"
                      }`}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  {dexscreenerUrl && (
                    <a
                      href={dexscreenerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#00c805]"
                    >
                      DexScreener ↗
                    </a>
                  )}
                  <a
                    href={explorer}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#00c805]"
                  >
                    Explorer ↗
                  </a>
                </div>
              </div>

              {mainTab === "chart" && (
                <>
                  {chartSrc ? (
                    <iframe
                      title={`${symbol} chart`}
                      src={chartSrc}
                      className="h-[420px] w-full sm:h-[520px] xl:h-[560px]"
                    />
                  ) : isCurve && curve ? (
                    <div className="p-3">
                      <CurveChart curve={curve} />
                    </div>
                  ) : (
                    <EmptyChart
                      loading={loading}
                      pairAddress={pairAddress}
                      dexscreenerUrl={dexscreenerUrl}
                    />
                  )}
                </>
              )}

              {mainTab === "trades" && (
                <>
                  {tradesSrc ? (
                    <iframe
                      title={`${symbol} trades`}
                      src={tradesSrc}
                      className="h-[420px] w-full sm:h-[520px] xl:h-[560px]"
                    />
                  ) : isCurve && curve ? (
                    <div className="p-3">
                      <RecentTrades curve={curve} />
                    </div>
                  ) : (
                    <div className="flex h-[320px] items-center justify-center text-sm text-white/40">
                      Trade tape loads when the pair is indexed.
                    </div>
                  )}
                </>
              )}

              {mainTab === "info" && (
                <div className="space-y-4 p-5 sm:p-6">
                  <div>
                    <h3 className="text-sm font-black text-white">
                      About ${symbol}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/50">
                      {meta?.description ||
                        `${name} ($${symbol}) trades on Robinhood Chain via Uniswap V2. Data refreshes from DexScreener every few seconds.`}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBlock title="How to buy">
                      <ol className="list-decimal space-y-1.5 pl-4 text-[12px] leading-relaxed text-white/50">
                        <li>Connect a wallet on Robinhood Chain (4663)</li>
                        <li>Fund with ETH on RH (bridge if needed)</li>
                        <li>Use Buy on Uniswap or quick amounts on the right</li>
                        <li>Always double-check the contract address</li>
                      </ol>
                    </InfoBlock>
                    <InfoBlock title="Safety checklist">
                      <ul className="space-y-1.5 text-[12px] leading-relaxed text-white/50">
                        <li>
                          · LP{" "}
                          {instant?.lpBurned
                            ? "burned — stronger lock signal"
                            : "may be removable if not burned"}
                        </li>
                        <li>
                          · Creator bag:{" "}
                          {creatorBps == null
                            ? "unknown"
                            : creatorBps === 0
                              ? "0% fair launch"
                              : `${creatorBps / 100}% at launch`}
                        </li>
                        <li>
                          · Verified X:{" "}
                          {launcherX ? `@${launcherX.handle}` : "not linked"}
                        </li>
                        <li>· Memecoins can go to zero. DYOR.</li>
                      </ul>
                    </InfoBlock>
                  </div>
                  {launcherX && (
                    <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs text-sky-100/90">
                      Launcher verified ownership of{" "}
                      <a
                        href={launcherX.profileUrl}
                        className="font-bold underline-offset-2 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        @{launcherX.handle}
                      </a>{" "}
                      via wallet signature + public tweet on HoodMemes.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Related */}
            {related.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
                    Trending on HoodMemes
                  </h3>
                  <Link
                    href="/"
                    className="text-[11px] font-semibold text-[#00c805] hover:underline"
                  >
                    Full board →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {related.map((t) => {
                    const up = (t.priceChange24h ?? 0) >= 0;
                    return (
                      <Link
                        key={t.address}
                        href={`/token/${t.address}`}
                        className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5 transition hover:border-[#00c805]/40 hover:bg-[#00c805]/5"
                      >
                        <div className="flex items-center gap-2">
                          {t.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.imageUrl}
                              alt=""
                              className="h-7 w-7 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00c805]/15 text-[10px] font-black text-[#00c805]">
                              {(t.symbol || "?")[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-xs font-black text-white">
                              ${t.symbol}
                            </div>
                            <div className="flex gap-1 text-[10px] tabular-nums">
                              <span className="text-white/40">
                                {formatUsd(t.marketCap)}
                              </span>
                              <span
                                className={
                                  up ? "text-[#00c805]" : "text-rose-400"
                                }
                              >
                                {formatPct(t.priceChange24h)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* RIGHT — trade desk */}
          <aside className="order-3 space-y-3">
            {isInstant ? (
              <div className="rounded-2xl border border-[#00c805]/30 bg-gradient-to-b from-[#00c805]/12 to-transparent p-4 shadow-[0_0_40px_rgba(0,200,5,0.12)]">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#00c805]">
                    Trade desk
                  </div>
                  <span className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-bold text-white/40">
                    UNISWAP V2
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                  Instant pool — swap RH ETH for ${symbol}. You&apos;ll confirm
                  in your wallet on Uniswap.
                </p>

                <label className="mt-4 block">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Amount (ETH)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ethIn}
                    onChange={(e) => setEthIn(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-[#00c805]/50"
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_ETH.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEthIn(v)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                        ethIn === v
                          ? "bg-[#00c805] text-black"
                          : "border border-white/10 text-white/55 hover:text-white"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <a
                  href={tradeUrl(ethIn)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#00c805] py-3.5 text-sm font-black text-black shadow-[0_0_28px_rgba(0,200,5,0.35)] hover:bg-[#00e006]"
                >
                  Buy ${symbol} with {ethIn || "—"} ETH
                </a>
                <a
                  href={tradeUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex w-full items-center justify-center rounded-xl border border-white/15 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/5"
                >
                  Open full Uniswap UI
                </a>
                {dexscreenerUrl && (
                  <a
                    href={dexscreenerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 flex w-full items-center justify-center rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-white/45 hover:text-white/70"
                  >
                    Advanced chart · DexScreener
                  </a>
                )}
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
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

            <Panel title="Market snapshot">
              <Row k="Price USD" v={formatPrice(stats?.priceUsd)} />
              <Row k="Market cap" v={formatUsd(stats?.marketCap)} />
              <Row k="Liquidity" v={formatUsd(stats?.liquidity)} />
              <Row k="24h volume" v={formatUsd(stats?.volume24h)} />
              <Row
                k="24h change"
                v={formatPct(chg.h24)}
                accent={(chg.h24 ?? 0) >= 0 ? "green" : "down"}
              />
              <Row k="Age" v={age || "—"} />
            </Panel>

            <Panel title="Quick links">
              <QLink href={tradeUrl()} label="Uniswap swap" />
              {dexscreenerUrl && (
                <QLink href={dexscreenerUrl} label="DexScreener" />
              )}
              <QLink href={explorer} label="Token explorer" />
              {pairAddress && (
                <QLink
                  href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${pairAddress}`}
                  label="Pair explorer"
                />
              )}
              {instant?.creator && (
                <QLink
                  href={creatorExplorer(instant.creator)}
                  label="Creator wallet"
                />
              )}
            </Panel>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3 text-[10px] leading-relaxed text-amber-100/60">
              <strong className="text-amber-100/80">Risk</strong> — Memecoins
              are extremely volatile. Liquidity can be thin. LP may not be
              burned. Never buy more than you can lose. Not financial advice.
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050806]/96 p-2.5 backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-black text-white">
              ${symbol}
            </div>
            <div className="truncate text-[11px] tabular-nums text-white/50">
              {formatPrice(stats?.priceUsd)}{" "}
              <span className={up24 ? "text-[#00c805]" : "text-rose-400"}>
                {formatPct(chg.h24)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copy(address, "ca")}
            className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-white/70"
          >
            {copied === "ca" ? "✓" : "CA"}
          </button>
          <a
            href={tradeUrl(ethIn)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#00c805] px-5 py-2.5 text-sm font-black text-black"
          >
            Buy
          </a>
        </div>
      </div>
      <div className="h-16 xl:hidden" />
    </div>
  );
}

/* ───────── UI atoms ───────── */

function Badge({
  children,
  green,
  warn,
}: {
  children: React.ReactNode;
  green?: boolean;
  warn?: boolean;
}) {
  const cls = green
    ? "bg-[#00c805]/15 text-[#00c805] ring-[#00c805]/25"
    : warn
      ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
      : "bg-white/8 text-white/55 ring-white/10";
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-white/35">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-black tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  k,
  v,
  mono,
  href,
  accent,
}: {
  k: string;
  v: string;
  mono?: boolean;
  href?: string;
  accent?: "green" | "warn" | "down";
}) {
  const color =
    accent === "green"
      ? "text-[#00c805]"
      : accent === "warn"
        ? "text-amber-200"
        : accent === "down"
          ? "text-rose-400"
          : "text-white/85";
  const val = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${color} font-semibold hover:underline ${mono ? "font-mono text-[10px]" : "text-xs"}`}
    >
      {v}
    </a>
  ) : (
    <span
      className={`${color} font-semibold ${mono ? "font-mono text-[10px]" : "text-xs"}`}
    >
      {v}
    </span>
  );
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5">
      <span className="text-[11px] text-white/40">{k}</span>
      {val}
    </div>
  );
}

function FlowBar({
  label,
  buys,
  sells,
  pct,
}: {
  label: string;
  buys: number;
  sells: number;
  pct: number;
}) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-[10px] font-semibold">
        <span className="text-white/40">{label}</span>
        <span className="tabular-nums">
          <span className="text-[#00c805]">{buys}B</span>
          <span className="text-white/20"> · </span>
          <span className="text-rose-400">{sells}S</span>
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-rose-500/35">
        <div className="bg-[#00c805]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  up,
  down,
}: {
  label: string;
  value: string;
  up?: boolean;
  down?: boolean;
}) {
  return (
    <div className="rounded-lg bg-black/35 px-2 py-1.5">
      <div className="text-[9px] text-white/35">{label}</div>
      <div
        className={`text-xs font-bold tabular-nums ${
          up ? "text-[#00c805]" : down ? "text-rose-400" : "text-white/80"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ContractRow({
  label,
  addr,
  href,
  onCopy,
}: {
  label: string;
  addr: string;
  href: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/30 px-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-semibold uppercase text-white/35">
          {label}
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-mono text-[10px] text-white/70 hover:text-[#00c805]"
        >
          {shortAddr(addr, 6)}
        </a>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold text-white/50 hover:text-white"
        >
          Copy
        </button>
      )}
    </div>
  );
}

function CopyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/55 hover:border-[#00c805]/40 hover:text-white"
    >
      {label}
    </button>
  );
}

function QLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg px-1 py-1.5 text-[12px] text-white/60 hover:bg-white/5 hover:text-white"
    >
      <span>{label}</span>
      <span className="text-white/25">↗</span>
    </a>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 p-3.5">
      <div className="text-[11px] font-bold text-white/70">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function compactQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function EmptyChart({
  loading,
  pairAddress,
  dexscreenerUrl,
}: {
  loading: boolean;
  pairAddress: string | null;
  dexscreenerUrl: string | null | undefined;
}) {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="text-sm text-white/40">
        {loading
          ? "Loading market data…"
          : "Chart appears once DexScreener indexes the pair."}
      </div>
      {(dexscreenerUrl || pairAddress) && (
        <a
          href={
            dexscreenerUrl ||
            `https://dexscreener.com/robinhood/${pairAddress}`
          }
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-[#00c805]"
        >
          Open on DexScreener ↗
        </a>
      )}
    </div>
  );
}
