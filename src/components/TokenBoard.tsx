"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardTab, TokenCardData } from "@/lib/types";
import type { SiteConfig } from "@/lib/site-config";
import { TokenCard } from "./TokenCard";
import { formatPct, formatUsd, shortAddr, timeAgo } from "@/lib/format";
import Link from "next/link";
import { AddNetworkButton } from "./AddNetworkButton";

const TABS: { id: BoardTab; label: string; emoji: string }[] = [
  { id: "trending", label: "Trending", emoji: "" },
  { id: "hot", label: "Hot 1h", emoji: "" },
  { id: "new", label: "New", emoji: "" },
  { id: "gainers", label: "Gainers", emoji: "" },
  { id: "losers", label: "Losers", emoji: "" },
  { id: "volume", label: "Volume", emoji: "" },
  { id: "mcap", label: "MCap", emoji: "" },
  { id: "liquidity", label: "Liquidity", emoji: "" },
];

type ViewMode = "grid" | "table";

export function TokenBoard() {
  const [tokens, setTokens] = useState<TokenCardData[]>([]);
  const [movers, setMovers] = useState<TokenCardData[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [tab, setTab] = useState<BoardTab>("trending");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [minLiqLocal, setMinLiqLocal] = useState(0);
  /** Enriched featured tokens (logo from launch-meta / tokens API) */
  const [featuredLive, setFeaturedLive] = useState<
    Record<string, TokenCardData>
  >({});

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => null);
  }, []);

  // Pull logo + live stats for each featured CA (board list often misses new launches)
  useEffect(() => {
    if (!config?.featured?.length) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, TokenCardData> = {};
      await Promise.all(
        config.featured.map(async (f) => {
          const addr = f.address.toLowerCase();
          try {
            const res = await fetch(`/api/tokens?address=${f.address}`, {
              cache: "no-store",
            });
            if (res.ok) {
              const j = await res.json();
              if (j.token) {
                next[addr] = j.token as TokenCardData;
                return;
              }
            }
          } catch {
            /* */
          }
          try {
            const m = await fetch(`/api/launch-meta?token=${f.address}`);
            if (m.ok) {
              const j = await m.json();
              const meta = j.meta;
              if (meta) {
                next[addr] = {
                  address: f.address,
                  name: meta.name || f.name || "Featured",
                  symbol: meta.symbol || f.symbol || "???",
                  pairAddress: meta.pair || null,
                  priceUsd: null,
                  marketCap: null,
                  volume24h: null,
                  volume1h: null,
                  volume6h: null,
                  priceChange5m: null,
                  priceChange1h: null,
                  priceChange6h: null,
                  priceChange24h: null,
                  liquidity: null,
                  imageUrl:
                    meta.imageUrl ||
                    `/api/logo/${addr}`,
                  dexscreenerUrl: null,
                  createdAt: meta.createdAt || null,
                  source: "hoodfun",
                  isNative: true,
                  txns24h: null,
                  buys24h: null,
                  sells24h: null,
                  trendScore: 0,
                };
              }
            }
          } catch {
            /* */
          }
        })
      );
      if (!cancelled) setFeaturedLive(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [config?.featured]);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 280);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tab });
      if (qDebounced.trim()) params.set("q", qDebounced.trim());
      const minLiq = minLiqLocal || config?.minLiquidityUsd || 0;
      if (minLiq) params.set("minLiq", String(minLiq));
      const res = await fetch(`/api/tokens?${params}`);
      if (!res.ok) throw new Error("Failed to load tokens");
      const data = await res.json();
      let list: TokenCardData[] = data.tokens ?? [];
      const hidden = new Set(
        (config?.hiddenTokens ?? []).map((a) => a.toLowerCase())
      );
      list = list.filter((t) => !hidden.has(t.address.toLowerCase()));
      setTokens(list);
      setMovers(data.movers ?? list.slice(0, 15));
      setUpdatedAt(data.updatedAt ?? Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [tab, qDebounced, config?.minLiquidityUsd, config?.hiddenTokens, minLiqLocal]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const featuredCards: TokenCardData[] = useMemo(() => {
    if (!config?.featured?.length) return [];
    return config.featured.map((f) => {
      const key = f.address.toLowerCase();
      const fromBoard = tokens.find((t) => t.address.toLowerCase() === key);
      const fromFeat = featuredLive[key];
      const live = fromFeat || fromBoard;
      const logo =
        live?.imageUrl ||
        f.imageUrl ||
        `/api/logo/${key}`;
      if (live) {
        return {
          ...live,
          name: f.name || live.name,
          symbol: f.symbol || live.symbol,
          imageUrl: logo,
          isNative: true,
        };
      }
      return {
        address: f.address,
        name: f.name || f.symbol || "Featured",
        symbol: f.symbol || "???",
        pairAddress: null,
        priceUsd: null,
        marketCap: null,
        volume24h: null,
        volume1h: null,
        volume6h: null,
        priceChange5m: null,
        priceChange1h: null,
        priceChange6h: null,
        priceChange24h: null,
        liquidity: null,
        imageUrl: logo,
        dexscreenerUrl: null,
        createdAt: null,
        source: "hoodfun" as const,
        isNative: true,
        txns24h: null,
        buys24h: null,
        sells24h: null,
        trendScore: 0,
      };
    });
  }, [config, tokens, featuredLive]);

  const boardTokens = useMemo(() => {
    if (!config?.featured?.length) return tokens;
    const feat = new Set(config.featured.map((f) => f.address.toLowerCase()));
    // keep featured in main list too for filters, but featured section is separate
    return tokens.filter((t) => !feat.has(t.address.toLowerCase()) || tab !== "trending");
  }, [tokens, config, tab]);

  const totals = useMemo(() => {
    const vol = tokens.reduce((s, t) => s + (t.volume24h ?? 0), 0);
    const mcap = tokens.reduce((s, t) => s + (t.marketCap ?? 0), 0);
    const hot = tokens.filter((t) => (t.priceChange1h ?? 0) > 5).length;
    return { vol, mcap, n: tokens.length, hot };
  }, [tokens]);

  if (config?.maintenanceMode) {
    return (
      <div className="hm-glass rounded-3xl px-6 py-20 text-center">
        <h1 className="text-2xl font-black text-amber-100">Under maintenance</h1>
        <p className="mt-2 text-sm text-amber-100/70">We&apos;ll be back shortly.</p>
      </div>
    );
  }

  const ticker = movers.length ? movers : tokens.slice(0, 12);
  const doubleTicker = [...ticker, ...ticker];
  const official = featuredCards[0];

  const offUp = (official?.priceChange24h ?? 0) >= 0;

  return (
    <div className="relative -mx-4 space-y-0 sm:-mx-0">
      {/* ═══ MEGA HERO ═══ */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="hm-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-[#ccff00]/25 blur-[100px]" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-[#ccff00]/12 blur-[90px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-40 w-[60%] -translate-x-1/2 rounded-full bg-[#ccff00]/10 blur-[80px]" />

        <div className="relative space-y-8 px-4 pb-10 pt-6 sm:px-0 sm:pb-12 sm:pt-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ccff00]/40 bg-[#ccff00]/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#ccff00] shadow-[0_0_24px_rgba(204, 255, 0,0.2)]">
                <span className="hm-live-dot h-2 w-2 rounded-full bg-[#ccff00]" />
                Live · Robinhood Chain · 4663
              </div>
              <h1 className="text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl md:text-7xl">
                <span className="bg-gradient-to-br from-white via-white to-[#ccff00] bg-clip-text text-transparent">
                  {config?.heroTitle || "Robinhood trenches"}
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
                {config?.heroSubtitle ||
                  "Launch a fixed-supply coin, seed Uniswap LP, trade immediately."}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/create"
                  className="rounded-2xl bg-[#ccff00] px-7 py-3.5 text-base font-black text-black shadow-[0_0_40px_rgba(204, 255, 0,0.45)] transition hover:scale-[1.02] hover:bg-[#e8ff66]"
                >
                  Launch coin
                </Link>
                <a
                  href="#board"
                  className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-base font-bold text-white/85 transition hover:border-[#ccff00]/45 hover:bg-[#ccff00]/10"
                >
                  Browse board
                </a>
                <button
                  type="button"
                  onClick={load}
                  className="rounded-2xl border border-white/10 px-4 py-3.5 text-sm font-semibold text-white/45 hover:text-white"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-5">
                <AddNetworkButton />
              </div>
            </div>

            <div className="grid w-full max-w-md grid-cols-2 gap-3 lg:max-w-sm">
              <HeroStatBig label="Tokens" value={String(totals.n)} accent />
              <HeroStatBig label="Vol 24h" value={formatUsd(totals.vol)} />
              <HeroStatBig label="Σ MCap" value={formatUsd(totals.mcap)} />
              <HeroStatBig label="Hot 1h" value={String(totals.hot)} />
            </div>
          </div>

          {/* Official mega banner */}
          {official && (
            <Link
              href={`/token/${official.address}${
                official.pairAddress ? `?pair=${official.pairAddress}` : ""
              }`}
              className="group relative block overflow-hidden rounded-[1.75rem] border border-[#ccff00]/45 bg-gradient-to-br from-[#ccff00]/20 via-[#0a140c] to-black p-1 shadow-[0_0_60px_rgba(204, 255, 0,0.2)] transition hover:border-[#ccff00]/70 hover:shadow-[0_0_80px_rgba(204, 255, 0,0.35)]"
            >
              <div className="relative overflow-hidden rounded-[1.4rem] bg-black/50 px-5 py-6 sm:px-8 sm:py-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#ccff00]/20 blur-3xl transition group-hover:bg-[#ccff00]/30" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[#ccff00]/10 blur-3xl" />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="relative shrink-0">
                    {official.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={official.imageUrl}
                        alt={official.symbol}
                        className="h-24 w-24 rounded-3xl object-cover shadow-[0_0_40px_rgba(204, 255, 0,0.35)] ring-2 ring-[#ccff00]/50 sm:h-28 sm:w-28"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#ccff00]/50 to-[#1a2200] text-4xl font-black text-[#ccff00] ring-2 ring-[#ccff00]/50 sm:h-28 sm:w-28">
                        {(official.symbol || "?")[0]}
                      </div>
                    )}
                    <span className="hm-live-dot absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-[#050806] bg-[#ccff00]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#ccff00] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                      ★ {config?.featuredSectionTitle || "Official"}
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                        ${official.symbol}
                      </span>
                      <span className="text-lg text-white/45">
                        {official.name}
                      </span>
                    </div>
                    <p className="mt-1 max-w-xl font-mono text-[11px] text-white/35 break-all">
                      {official.address}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <div>
                        <div className="text-[10px] uppercase text-white/35">
                          MCap
                        </div>
                        <div className="font-black tabular-nums text-white">
                          {formatUsd(official.marketCap)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-white/35">
                          24h
                        </div>
                        <div
                          className={`font-black tabular-nums ${
                            offUp ? "text-[#ccff00]" : "text-rose-400"
                          }`}
                        >
                          {formatPct(official.priceChange24h)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-white/35">
                          Liq
                        </div>
                        <div className="font-black tabular-nums text-white">
                          {formatUsd(official.liquidity)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <span className="rounded-2xl bg-[#ccff00] px-6 py-3 text-center text-sm font-black text-black shadow-[0_0_28px_rgba(204, 255, 0,0.4)] transition group-hover:scale-105">
                      Trade ${official.symbol} →
                    </span>
                    <span className="text-center text-[10px] text-white/35">
                      Official HoodMemes token
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* How it works strip */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { n: "01", t: "Launch", d: "Fixed supply · 0–10% creator" },
              { n: "02", t: "V3 LP lock", d: "100% supply → Uni V3 · LP locked forever" },
              { n: "03", t: "Go live", d: "Trade · share · get on board" },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 backdrop-blur"
              >
                <div className="text-xs font-black tracking-widest text-[#ccff00]">
                  {s.n}
                </div>
                <div className="mt-1 text-base font-black text-white">{s.t}</div>
                <div className="mt-0.5 text-xs text-white/40">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee ticker */}
      {ticker.length > 0 && (
        <div className="relative border-b border-white/5 bg-black/40 py-2.5 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#050806] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#050806] to-transparent" />
          <div className="hm-marquee-track flex gap-6 px-4">
            {doubleTicker.map((t, i) => {
              const up = (t.priceChange1h ?? t.priceChange24h ?? 0) >= 0;
              return (
                <Link
                  key={`${t.address}-${i}`}
                  href={`/token/${t.address}`}
                  className="flex shrink-0 items-center gap-2 text-xs"
                >
                  {t.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.imageUrl} alt="" className="h-5 w-5 rounded-full" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ccff00]/20 text-[9px] font-bold text-[#ccff00]">
                      {t.symbol[0]}
                    </span>
                  )}
                  <span className="font-bold text-white">${t.symbol}</span>
                  <span className={up ? "text-[#ccff00]" : "text-rose-400"}>
                    {formatPct(t.priceChange1h ?? t.priceChange24h)}
                  </span>
                  <span className="text-white/30">{formatUsd(t.volume1h ?? t.volume24h)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-6 px-4 py-6 sm:px-0">
        {/* Featured */}
        {featuredCards.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#ccff00]">
                <span className="text-lg">★</span>
                {config?.featuredSectionTitle || "Featured"}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCards.map((t, i) => (
                <TokenCard
                  key={t.address.toLowerCase()}
                  token={t}
                  badge="FEATURED"
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-center">
            <p className="text-sm text-rose-100">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-2 rounded-xl bg-[#ccff00] px-4 py-2 text-xs font-bold text-black"
            >
              Retry
            </button>
          </div>
        )}

        {config?.showDexBoard !== false && (
          <>
            {/* Filters bar */}
            <div
              id="board"
              className="hm-glass sticky top-14 z-40 space-y-3 rounded-2xl p-3 shadow-2xl shadow-black/40"
            >
              <div className="flex gap-1.5 overflow-x-auto hm-scroll pb-0.5">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      tab === t.id
                        ? "bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204, 255, 0,0.35)]"
                        : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                    ⌕
                  </span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search ticker, name, or 0x address…"
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#ccff00]/50 focus:ring-1 focus:ring-[#ccff00]/25"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { v: 0, l: "All liq" },
                    { v: 1000, l: ">$1K" },
                    { v: 10000, l: ">$10K" },
                    { v: 50000, l: ">$50K" },
                  ].map((x) => (
                    <button
                      key={x.v}
                      type="button"
                      onClick={() => setMinLiqLocal(x.v)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                        minLiqLocal === x.v
                          ? "bg-white/15 text-white"
                          : "bg-white/5 text-white/40 hover:text-white/70"
                      }`}
                    >
                      {x.l}
                    </button>
                  ))}
                  <div className="ml-1 flex rounded-lg border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => setView("grid")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                        view === "grid" ? "bg-[#ccff00] text-black" : "text-white/40"
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("table")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                        view === "table" ? "bg-[#ccff00] text-black" : "text-white/40"
                      }`}
                    >
                      Table
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/30">
                <span>
                  {boardTokens.length} coins · {TABS.find((t) => t.id === tab)?.label}
                  {updatedAt
                    ? ` · updated ${new Date(updatedAt).toLocaleTimeString()}`
                    : ""}
                </span>
                <span className="hidden sm:inline">Auto-refresh 30s</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            {loading && tokens.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="hm-shimmer h-44 rounded-2xl" />
                ))}
              </div>
            ) : boardTokens.length === 0 ? (
              <div className="hm-glass rounded-3xl px-6 py-20 text-center">
                <p className="text-lg font-bold text-white/70">No coins in this filter</p>
                <p className="mt-2 text-sm text-white/40">
                  Try another tab or{" "}
                  <Link href="/create" className="font-semibold text-[#ccff00]">
                    launch the first one
                  </Link>
                </p>
              </div>
            ) : view === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {boardTokens.map((t, i) => (
                  <TokenCard
                    key={t.address.toLowerCase()}
                    token={t}
                    rank={tab === "trending" || tab === "hot" ? i + 1 : undefined}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <div className="hm-glass overflow-hidden rounded-2xl">
                <div className="overflow-x-auto hm-scroll">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/35">
                        <th className="px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">Token</th>
                        <th className="px-4 py-3 font-semibold">MCap</th>
                        <th className="px-4 py-3 font-semibold">24h</th>
                        <th className="px-4 py-3 font-semibold">1h</th>
                        <th className="px-4 py-3 font-semibold">Vol 24h</th>
                        <th className="px-4 py-3 font-semibold">Liq</th>
                        <th className="px-4 py-3 font-semibold">Age</th>
                        <th className="px-4 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {boardTokens.map((t, i) => {
                        const up = (t.priceChange24h ?? 0) >= 0;
                        const up1 = (t.priceChange1h ?? 0) >= 0;
                        return (
                          <tr
                            key={t.address}
                            className="border-b border-white/5 transition hover:bg-[#ccff00]/[0.06]"
                          >
                            <td className="px-4 py-3 tabular-nums text-white/30">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/token/${t.address}`}
                                className="flex items-center gap-2.5"
                              >
                                {t.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={t.imageUrl}
                                    alt=""
                                    className="h-9 w-9 rounded-xl object-cover"
                                  />
                                ) : (
                                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ccff00]/15 font-bold text-[#ccff00]">
                                    {t.symbol[0]}
                                  </span>
                                )}
                                <span>
                                  <span className="block font-bold text-white">
                                    ${t.symbol}
                                  </span>
                                  <span className="font-mono text-[10px] text-white/30">
                                    {shortAddr(t.address)}
                                  </span>
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 font-semibold tabular-nums text-white">
                              {formatUsd(t.marketCap)}
                            </td>
                            <td
                              className={`px-4 py-3 font-bold tabular-nums ${up ? "text-[#ccff00]" : "text-rose-400"}`}
                            >
                              {formatPct(t.priceChange24h)}
                            </td>
                            <td
                              className={`px-4 py-3 tabular-nums ${up1 ? "text-[#ccff00]/80" : "text-rose-400/80"}`}
                            >
                              {formatPct(t.priceChange1h)}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-white/80">
                              {formatUsd(t.volume24h)}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-white/80">
                              {formatUsd(t.liquidity)}
                            </td>
                            <td className="px-4 py-3 text-white/40">
                              {timeAgo(t.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/token/${t.address}`}
                                className="rounded-lg bg-[#ccff00]/15 px-2.5 py-1 text-[11px] font-bold text-[#ccff00] hover:bg-[#ccff00] hover:text-black"
                              >
                                Trade
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-6 text-xs text-white/40">
          <a
            href={
              config?.social.twitter || "https://x.com/hoodmemesdotfun"
            }
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:text-[#ccff00]"
          >
            𝕏 @hoodmemesdotfun
          </a>
          {config?.social.telegram && (
            <a
              href={config.social.telegram}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#ccff00]"
            >
              Telegram
            </a>
          )}
          {config?.social.discord && (
            <a
              href={config.social.discord}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#ccff00]"
            >
              Discord
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroStatBig({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-black tabular-nums sm:text-2xl ${
          accent ? "text-[#ccff00]" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
