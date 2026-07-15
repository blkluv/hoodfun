"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import type { Address } from "viem";
import type { CurveSnapshot } from "@/lib/curve";
import type { TokenCardData } from "@/lib/types";
import { CurveChart, CurveStats, RecentTrades } from "./CurveChart";
import { TokenTradeSection } from "./TokenTradeSection";
import { SwapBridgePanel } from "./SwapBridgePanel";
import { CreatorFeesPanel } from "./CreatorFeesPanel";
import { LaunchHealthPanel } from "./LaunchHealth";
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
import { fomoTokenUrl, dexscreenerPairUrl, dexscreenerTokenUrl } from "@/lib/dex-links";

type InstantLaunch = {
  kind: "instant";
  token: string;
  pair: string;
  creator: string;
  totalSupply?: string;
  lpEth?: string;
  lpBurned?: boolean;
  /** HoodV3 — LP always permanently locked */
  v3?: boolean;
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
    imageUrl?: string;
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
  /** HoodMemes logo wins over Dex until Dex has one */
  const displayImage =
    meta?.imageUrl || stats?.imageUrl || dexToken?.imageUrl || null;

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
    <div className="relative -mx-4 min-h-[70vh] bg-[#0e1116] text-[#e8eaed] sm:mx-0">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-3">
          <Link
            href="/"
            className="text-sm font-semibold text-[#9aa3ab] transition-colors hover:text-[#e8eaed]"
          >
            ← Board
          </Link>
        </div>
        {/* Trust / risk banners */}
        {isInstant && instant && (instant.v3 || instant.lpBurned) ? (
          <div className="mb-4 rounded-lg border border-[#ccff00]/25 bg-[#ccff00]/10 px-4 py-2.5 text-xs font-semibold text-[#e8ff99]">
            LP locked forever — Uniswap V3 position cannot be withdrawn. Creator
            earns 50% of swap fees only (no LP pull).
          </div>
        ) : null}
        {(creatorBps != null && creatorBps >= 500) ||
        (isInstant && instant && !instant.lpBurned && !instant.v3) ? (
          <div className="mb-4 space-y-2">
            {isInstant && instant && !instant.lpBurned && !instant.v3 && (
              <div className="rounded-lg border border-[#f08c1a]/30 bg-[#f08c1a]/10 px-4 py-2.5 text-xs font-semibold text-[#f0bc7a]">
                LP not locked — creator may be able to remove liquidity. Trade
                carefully.
              </div>
            )}
            {creatorBps != null && creatorBps >= 500 && (
              <div className="rounded-lg border border-[#f08c1a]/30 bg-[#f08c1a]/10 px-4 py-2.5 text-xs font-semibold text-[#f0bc7a]">
                Creator allocation {creatorBps / 100}% at launch — check
                tokenomics before size.
              </div>
            )}
          </div>
        ) : null}

        {/* ═══ HEADER CARD (LaunchHood-style) ═══ */}
        <header className="mb-4 rounded-lg border border-[#2a2f37] bg-[#171b21] p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImage}
                  alt={symbol}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-[#2a2f37]"
                />
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#0e1116] text-xl font-bold text-[#ccff00] ring-1 ring-[#2a2f37]">
                  {symbol[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold leading-none text-[#e8eaed]">
                    ${symbol}
                  </h1>
                  {name !== symbol && (
                    <span className="truncate text-sm text-[#9aa3ab]">
                      {name}
                    </span>
                  )}
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ccff00]" />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {isInstant && <Badge green>Uniswap V3</Badge>}
                  {isCurve && <Badge green>Bonding</Badge>}
                  {(instant?.v3 || instant?.lpBurned) && (
                    <Badge green>LP locked forever</Badge>
                  )}
                  {isInstant && !instant?.lpBurned && !instant?.v3 && (
                    <Badge warn>LP not locked</Badge>
                  )}
                  {(instant?.v3 || creatorBps === 0) && (
                    <Badge>No free creator bag</Badge>
                  )}
                  {creatorBps != null && creatorBps > 0 && !instant?.v3 && (
                    <Badge warn>Creator {creatorBps / 100}%</Badge>
                  )}
                  {age && <Badge>{age}</Badge>}
                  {launcherX && (
                    <VerifiedBadge
                      handle={launcherX.handle}
                      href={launcherX.profileUrl}
                      size="sm"
                    />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => copy(address, "ca")}
                    className="font-mono text-[#9aa3ab] transition-colors hover:text-[#ccff00]"
                  >
                    {copied === "ca" ? "Copied" : shortAddr(address, 6)}
                  </button>
                  {pairAddress && (
                    <button
                      type="button"
                      onClick={() => copy(pairAddress, "pair")}
                      className="font-mono text-[#9aa3ab] transition-colors hover:text-[#ccff00]"
                    >
                      pool {shortAddr(pairAddress, 4)}
                    </button>
                  )}
                  <a
                    href={explorer}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#9aa3ab] hover:text-[#ccff00]"
                  >
                    Explorer
                  </a>
                  {dexscreenerUrl && (
                    <a
                      href={dexscreenerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9aa3ab] hover:text-[#ccff00]"
                    >
                      DexScreener
                    </a>
                  )}
                  {socials.slice(0, 4).map((s) => (
                    <a
                      key={s.href + s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9aa3ab] hover:text-[#ccff00]"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Price + windows */}
            <div className="flex shrink-0 flex-col gap-1 sm:items-end sm:text-right">
              <div className="num text-lg font-bold tabular-nums text-[#e8eaed] sm:text-xl">
                {formatPrice(stats?.priceUsd)}
              </div>
              <div
                className={`text-sm font-semibold tabular-nums ${
                  up24 ? "text-[#ccff00]" : "text-[#f2555a]"
                }`}
              >
                {formatPct(chg.h24)} 24h
              </div>
              <div className="mt-1 grid grid-cols-4 gap-1.5">
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
                    className="rounded-md border border-[#2a2f37] bg-[#0e1116] px-1.5 py-1 text-center"
                  >
                    <div className="text-[10px] text-[#9aa3ab]">{lab}</div>
                    <div
                      className={`text-[11px] font-semibold tabular-nums ${
                        (v ?? 0) >= 0 ? "text-[#ccff00]" : "text-[#f2555a]"
                      }`}
                    >
                      {formatPct(v)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Compact stats strip */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#2a2f37] pt-3 sm:grid-cols-4 lg:grid-cols-6">
            <Stat label="Market cap" value={formatUsd(stats?.marketCap)} />
            <Stat label="Liquidity" value={formatUsd(stats?.liquidity)} />
            <Stat label="Vol 24h" value={formatUsd(stats?.volume24h)} />
            <Stat label="Vol 1h" value={formatUsd(stats?.volume1h)} />
            <Stat
              label="Txns 24h"
              value={
                stats?.txns24h != null
                  ? String(stats.txns24h)
                  : buys24 || sells24
                    ? String(buys24 + sells24)
                    : "—"
              }
            />
            <Stat label="Buy / sell" value={`${buys24} / ${sells24}`} />
          </div>
          {meta?.description && (
            <p className="mt-3 text-sm leading-relaxed text-[#9aa3ab]">
              {meta.description}
            </p>
          )}
        </header>

        {loading && !stats && !instant && (
          <div className="mb-4 h-40 animate-pulse rounded-lg border border-[#2a2f37] bg-[#171b21]" />
        )}
        {err && !instant && (
          <div className="mb-4 rounded-lg border border-[#f08c1a]/30 bg-[#f08c1a]/10 px-4 py-3 text-xs text-[#f0bc7a]">
            {err}
          </div>
        )}

        {/* ═══ MAIN: chart + sticky trade (LaunchHood 1fr / 320px) ═══ */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:gap-4">
          <section className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-lg border border-[#2a2f37] bg-[#171b21] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2f37] px-3 py-2">
                <div className="flex gap-1 rounded-md bg-[#0e1116] p-1">
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
                      className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                        mainTab === id
                          ? "bg-[#ccff00] text-black"
                          : "text-[#9aa3ab] hover:text-[#e8eaed]"
                      }`}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#9aa3ab]">
                  <span className="hidden sm:inline">
                    live · {new Date(lastRefresh).toLocaleTimeString()}
                  </span>
                  {dexscreenerUrl && (
                    <a
                      href={dexscreenerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#ccff00]"
                    >
                      DexScreener ↗
                    </a>
                  )}
                </div>
              </div>

              {mainTab === "chart" && (
                <>
                  {chartSrc ? (
                    <iframe
                      title={`${symbol} chart`}
                      src={chartSrc}
                      className="h-[420px] w-full sm:h-[480px] lg:h-[520px]"
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
                      className="h-[420px] w-full sm:h-[480px] lg:h-[520px]"
                    />
                  ) : isCurve && curve ? (
                    <div className="p-3">
                      <RecentTrades curve={curve} />
                    </div>
                  ) : (
                    <div className="grid h-[320px] place-items-center text-sm text-[#9aa3ab]">
                      No trades yet — be the first.
                    </div>
                  )}
                </>
              )}

              {mainTab === "info" && (
                <div className="space-y-4 p-4 sm:p-5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9aa3ab]">
                      About
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#e8eaed]/90">
                      {meta?.description ||
                        `${name} ($${symbol}) trades on Robinhood Chain via Uniswap V3. Live data from DexScreener.`}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBlock title="How to buy">
                      <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-[#9aa3ab]">
                        <li>Wallet on Robinhood Chain (4663)</li>
                        <li>Fund with ETH on RH</li>
                        <li>Buy with the panel on the right</li>
                        <li>Verify CA before every trade</li>
                      </ol>
                    </InfoBlock>
                    <InfoBlock title="Safety">
                      <ul className="space-y-1.5 text-xs leading-relaxed text-[#9aa3ab]">
                        <li>
                          · LP{" "}
                          {instant?.lpBurned || isInstant
                            ? "locked forever (V3 locker)"
                            : "may be removable"}
                        </li>
                        <li>
                          · Creator:{" "}
                          {creatorBps == null
                            ? "see launch"
                            : creatorBps === 0
                              ? "no free bag (buy on open)"
                              : `${creatorBps / 100}% at launch`}
                        </li>
                        <li>
                          · X:{" "}
                          {launcherX ? `@${launcherX.handle}` : "not linked"}
                        </li>
                        <li>· Memecoins can go to zero. DYOR.</li>
                      </ul>
                    </InfoBlock>
                  </div>
                </div>
              )}
            </div>

            {/* Details under chart */}
            <div className="grid gap-3 sm:grid-cols-2">
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
              </Panel>
              <Panel title="Pool">
                <Row k="Liquidity" v={formatUsd(stats?.liquidity)} />
                <Row
                  k="DEX"
                  v={stats?.dexId ? stats.dexId.toUpperCase() : "Uniswap"}
                />
                <Row
                  k="Pool"
                  v={pairAddress ? shortAddr(pairAddress, 5) : "—"}
                  mono
                />
                {isInstant && (
                  <Row k="LP" v="Locked forever" accent="green" />
                )}
              </Panel>
              <Panel title="Token">
                {isInstant && instant ? (
                  <>
                    <Row
                      k="Supply"
                      v={formatSupply(instant.totalSupply)}
                    />
                    <Row
                      k="Creator"
                      v={shortAddr(instant.creator, 5)}
                      mono
                      href={creatorExplorer(instant.creator)}
                    />
                    <Row k="Age" v={age || "—"} />
                  </>
                ) : isCurve && curve ? (
                  <div className="-mx-1">
                    <CurveStats curve={curve} />
                  </div>
                ) : (
                  <Row k="Type" v="External pair" />
                )}
              </Panel>
              <Panel title="Contracts">
                <ContractRow
                  label="Token"
                  addr={address}
                  href={explorer}
                  onCopy={() => copy(address, "ca")}
                />
                {pairAddress && (
                  <ContractRow
                    label="Pool"
                    addr={pairAddress}
                    href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${pairAddress}`}
                    onCopy={() => copy(pairAddress, "pair")}
                  />
                )}
              </Panel>
            </div>

            {related.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9aa3ab]">
                    Trending
                  </h3>
                  <Link
                    href="/"
                    className="text-xs font-semibold text-[#ccff00] hover:underline"
                  >
                    Board →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {related.slice(0, 6).map((t) => {
                    const up = (t.priceChange24h ?? 0) >= 0;
                    return (
                      <Link
                        key={t.address}
                        href={`/token/${t.address}`}
                        className="rounded-lg border border-[#2a2f37] bg-[#171b21] p-2.5 transition hover:border-[#ccff00]/40"
                      >
                        <div className="flex items-center gap-2">
                          {t.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.imageUrl}
                              alt=""
                              className="h-7 w-7 rounded-md object-cover"
                            />
                          ) : (
                            <div className="grid h-7 w-7 place-items-center rounded-md bg-[#0e1116] text-[10px] font-bold text-[#ccff00]">
                              {(t.symbol || "?")[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-[#e8eaed]">
                              ${t.symbol}
                            </div>
                            <div className="flex gap-1 text-[10px] tabular-nums">
                              <span className="text-[#9aa3ab]">
                                {formatUsd(t.marketCap)}
                              </span>
                              <span
                                className={
                                  up ? "text-[#ccff00]" : "text-[#f2555a]"
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

          {/* RIGHT — sticky trade + Relay bridge */}
          <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
            <LaunchHealthPanel token={address} />

            {isInstant || pairAddress ? (
              <SwapBridgePanel
                token={address}
                symbol={symbol}
                poolKind={isInstant ? "v3" : "v2"}
              />
            ) : (
              <Suspense
                fallback={
                  <div className="h-72 animate-pulse rounded-lg border border-[#2a2f37] bg-[#171b21]" />
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

            <Panel title="Snapshot">
              <Row k="Price" v={formatPrice(stats?.priceUsd)} />
              <Row k="Mcap" v={formatUsd(stats?.marketCap)} />
              <Row k="Liquidity" v={formatUsd(stats?.liquidity)} />
              <Row
                k="24h"
                v={formatPct(chg.h24)}
                accent={(chg.h24 ?? 0) >= 0 ? "green" : "down"}
              />
            </Panel>

            <CreatorFeesPanel tokenAddress={address} compact />

            <div className="rounded-lg border border-[#2a2f37] bg-[#171b21] p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#9aa3ab]">
                Trade elsewhere
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={fomoTokenUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[#2a2f37] bg-[#0f1318] px-2.5 py-1.5 text-[11px] font-semibold text-[#e8eaed] hover:border-[#ccff00]/40 hover:text-[#ccff00]"
                >
                  Fomo ↗
                </a>
                <a
                  href={
                    pairAddress
                      ? dexscreenerPairUrl(pairAddress)
                      : dexscreenerTokenUrl(address)
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[#2a2f37] bg-[#0f1318] px-2.5 py-1.5 text-[11px] font-semibold text-[#e8eaed] hover:border-[#ccff00]/40 hover:text-[#ccff00]"
                >
                  DexScreener ↗
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-[#2a2f37] bg-[#171b21] p-3 text-[10px] leading-relaxed text-[#9aa3ab]">
              <strong className="text-[#e8eaed]/80">Risk</strong> — Memecoins
              are extremely volatile. Bridging uses Relay (third-party). Never
              buy more than you can lose. Not financial advice.
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky buy */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2a2f37] bg-[#171b21]/95 p-2.5 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#e8eaed]">
              ${symbol}
            </div>
            <div className="truncate text-[11px] tabular-nums text-[#9aa3ab]">
              {formatPrice(stats?.priceUsd)}{" "}
              <span
                className={up24 ? "text-[#ccff00]" : "text-[#f2555a]"}
              >
                {formatPct(chg.h24)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copy(address, "ca")}
            className="rounded-md border border-[#2a2f37] px-3 py-2.5 text-xs font-semibold text-[#9aa3ab]"
          >
            {copied === "ca" ? "✓" : "CA"}
          </button>
          <a
            href={tradeUrl(ethIn)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-[#ccff00] px-5 py-2.5 text-sm font-bold text-black"
          >
            Buy
          </a>
        </div>
      </div>
      <div className="h-16 lg:hidden" />
    </div>
  );
}

/* ───────── UI atoms (LaunchHood-adjacent: slate surfaces, soft borders) ───────── */

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
    ? "bg-[#ccff00]/15 text-[#ccff00]"
    : warn
      ? "bg-[#f08c1a]/15 text-[#f0bc7a]"
      : "bg-[#0e1116] text-[#9aa3ab]";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#9aa3ab]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-[#e8eaed]">
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
    <div className="rounded-lg border border-[#2a2f37] bg-[#171b21] p-3 shadow-sm sm:p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9aa3ab]">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
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
      ? "text-[#ccff00]"
      : accent === "warn"
        ? "text-[#f0bc7a]"
        : accent === "down"
          ? "text-[#f2555a]"
          : "text-[#e8eaed]";
  const val = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${color} text-xs font-semibold hover:text-[#ccff00] hover:underline ${mono ? "font-mono text-[10px]" : ""}`}
    >
      {v}
    </a>
  ) : (
    <span
      className={`${color} text-xs font-semibold tabular-nums ${mono ? "font-mono text-[10px]" : ""}`}
    >
      {v}
    </span>
  );
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[11px] text-[#9aa3ab]">{k}</span>
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
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-[#9aa3ab]">{label}</span>
        <span className="tabular-nums">
          <span className="text-[#ccff00]">{buys}B</span>
          <span className="text-[#2a2f37]"> · </span>
          <span className="text-[#f2555a]">{sells}S</span>
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-[#f2555a]/30">
        <div className="bg-[#ccff00]" style={{ width: `${pct}%` }} />
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
    <div className="flex items-center gap-2 rounded-md border border-[#2a2f37] bg-[#0e1116] px-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase text-[#9aa3ab]">
          {label}
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-mono text-[10px] text-[#e8eaed]/80 hover:text-[#ccff00]"
        >
          {shortAddr(addr, 6)}
        </a>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="rounded bg-[#171b21] px-2 py-1 text-[10px] font-semibold text-[#9aa3ab] hover:text-[#e8eaed]"
        >
          Copy
        </button>
      )}
    </div>
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
    <div className="rounded-md border border-[#2a2f37] bg-[#0e1116] p-3">
      <div className="text-[11px] font-semibold text-[#e8eaed]/80">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
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
    <div className="grid h-[360px] place-items-center px-6 text-center">
      <div>
        <div className="font-mono text-sm text-[#9aa3ab]">
          {loading
            ? "Loading market data…"
            : "Live chart coming soon — pair indexing"}
        </div>
        {(dexscreenerUrl || pairAddress) && (
          <a
            href={
              dexscreenerUrl ||
              `https://dexscreener.com/robinhood/${pairAddress}`
            }
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-[#ccff00] hover:underline"
          >
            Open on DexScreener ↗
          </a>
        )}
      </div>
    </div>
  );
}
