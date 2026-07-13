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

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => null);
  }, []);

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
      const live = tokens.find(
        (t) => t.address.toLowerCase() === f.address.toLowerCase()
      );
      return (
        live ?? {
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
          imageUrl: f.imageUrl ?? null,
          dexscreenerUrl: null,
          createdAt: null,
          source: "hoodfun" as const,
          isNative: !!f.market,
          txns24h: null,
          buys24h: null,
          sells24h: null,
          trendScore: 0,
        }
      );
    });
  }, [config, tokens]);

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

  return (
    <div className="relative -mx-4 space-y-0 sm:-mx-0">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 px-4 pb-8 pt-2 sm:px-0">
        <div className="hm-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00c805]/30 bg-[#00c805]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#00c805]">
                <span className="hm-live-dot h-2 w-2 rounded-full bg-[#00c805]" />
                Live on Robinhood Chain · 4663
              </div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
                <span className="bg-gradient-to-r from-white via-white to-[#00c805] bg-clip-text text-transparent">
                  {config?.heroTitle || "Robinhood trenches"}
                </span>
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/45 sm:text-base">
                {config?.heroSubtitle ||
                  "Launch a fixed-supply coin, seed Uniswap LP, trade immediately."}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/create"
                  className="rounded-xl bg-[#00c805] px-5 py-2.5 text-sm font-black text-black shadow-[0_0_30px_rgba(0,200,5,0.35)] transition hover:bg-[#00e006]"
                >
                  Launch coin
                </Link>
                <a
                  href="#board"
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-[#00c805]/40 hover:text-white"
                >
                  Browse trenches
                </a>
                <button
                  type="button"
                  onClick={load}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/50 hover:text-white"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-4">
                <AddNetworkButton />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <HeroStat label="Tokens" value={String(totals.n)} accent />
              <HeroStat label="Vol 24h" value={formatUsd(totals.vol)} />
              <HeroStat label="Σ MCap" value={formatUsd(totals.mcap)} />
              <HeroStat label="Hot 1h" value={String(totals.hot)} />
            </div>
          </div>

          {/* How it works */}
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { n: "1", t: "Launch", d: "Name, supply, creator % (0–10%)" },
              { n: "2", t: "Seed LP", d: "Your ETH + tokens → Uniswap V2" },
              { n: "3", t: "Trade", d: "Live pool · DexScreener · share CA" },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/8 bg-black/30 px-3 py-3"
              >
                <div className="text-[10px] font-black text-[#00c805]">{s.n}</div>
                <div className="text-sm font-bold text-white">{s.t}</div>
                <div className="text-[11px] text-white/40">{s.d}</div>
              </div>
            ))}
          </div>

          {official && (
            <Link
              href={`/token/${official.address}`}
              className="block overflow-hidden rounded-3xl border border-[#00c805]/35 bg-gradient-to-r from-[#00c805]/15 via-transparent to-transparent p-4 transition hover:border-[#00c805]/55 sm:p-5"
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#00c805]">
                {config?.featuredSectionTitle || "Official / Featured"}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <div className="text-2xl font-black text-white">
                  ${official.symbol}
                </div>
                <div className="text-sm text-white/45">{official.name}</div>
                <div className="ml-auto text-sm font-bold tabular-nums text-white">
                  {formatUsd(official.marketCap)}{" "}
                  <span
                    className={
                      (official.priceChange24h ?? 0) >= 0
                        ? "text-[#00c805]"
                        : "text-rose-400"
                    }
                  >
                    {formatPct(official.priceChange24h)}
                  </span>
                </div>
              </div>
              <div className="mt-1 font-mono text-[10px] text-white/30">
                {official.address}
              </div>
            </Link>
          )}
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
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00c805]/20 text-[9px] font-bold text-[#00c805]">
                      {t.symbol[0]}
                    </span>
                  )}
                  <span className="font-bold text-white">${t.symbol}</span>
                  <span className={up ? "text-[#00c805]" : "text-rose-400"}>
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
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#00c805]">
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
              className="mt-2 rounded-xl bg-[#00c805] px-4 py-2 text-xs font-bold text-black"
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
                        ? "bg-[#00c805] text-black shadow-[0_0_20px_rgba(0,200,5,0.35)]"
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
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00c805]/50 focus:ring-1 focus:ring-[#00c805]/25"
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
                        view === "grid" ? "bg-[#00c805] text-black" : "text-white/40"
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("table")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                        view === "table" ? "bg-[#00c805] text-black" : "text-white/40"
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
                  <Link href="/create" className="font-semibold text-[#00c805]">
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
                            className="border-b border-white/5 transition hover:bg-[#00c805]/[0.06]"
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
                                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00c805]/15 font-bold text-[#00c805]">
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
                              className={`px-4 py-3 font-bold tabular-nums ${up ? "text-[#00c805]" : "text-rose-400"}`}
                            >
                              {formatPct(t.priceChange24h)}
                            </td>
                            <td
                              className={`px-4 py-3 tabular-nums ${up1 ? "text-[#00c805]/80" : "text-rose-400/80"}`}
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
                                className="rounded-lg bg-[#00c805]/15 px-2.5 py-1 text-[11px] font-bold text-[#00c805] hover:bg-[#00c805] hover:text-black"
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
            className="font-semibold hover:text-[#00c805]"
          >
            𝕏 @hoodmemesdotfun
          </a>
          {config?.social.telegram && (
            <a
              href={config.social.telegram}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#00c805]"
            >
              Telegram
            </a>
          )}
          {config?.social.discord && (
            <a
              href={config.social.discord}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#00c805]"
            >
              Discord
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-3 py-3 ${
        accent
          ? "hm-glass-green"
          : "border border-white/8 bg-black/30"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-black tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}
