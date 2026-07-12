"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SortKey, TokenCardData } from "@/lib/types";
import type { SiteConfig } from "@/lib/site-config";
import { TokenCard } from "./TokenCard";
import { formatUsd } from "@/lib/format";
import Link from "next/link";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "marketCap", label: "Market cap" },
  { key: "volume24h", label: "Volume" },
  { key: "priceChange24h", label: "Gainers" },
  { key: "createdAt", label: "Newest" },
];

export function TokenBoard() {
  const [tokens, setTokens] = useState<TokenCardData[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [sort, setSort] = useState<SortKey>("marketCap");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort });
      if (q.trim()) params.set("q", q.trim());
      if (config?.minLiquidityUsd) {
        params.set("minLiq", String(config.minLiquidityUsd));
      }
      const res = await fetch(`/api/tokens?${params}`);
      if (!res.ok) throw new Error("Failed to load tokens");
      const data = await res.json();
      let list: TokenCardData[] = data.tokens ?? [];
      const hidden = new Set(
        (config?.hiddenTokens ?? []).map((a) => a.toLowerCase())
      );
      list = list.filter((t) => !hidden.has(t.address.toLowerCase()));
      setTokens(list);
      setUpdatedAt(data.updatedAt ?? Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [sort, q, config?.minLiquidityUsd, config?.hiddenTokens]);

  useEffect(() => {
    load();
    const id = setInterval(load, 45_000);
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
          priceChange24h: null,
          liquidity: null,
          imageUrl: f.imageUrl ?? null,
          dexscreenerUrl: null,
          createdAt: null,
          source: "hoodfun" as const,
          isNative: !!f.market,
          txns24h: null,
        }
      );
    });
  }, [config, tokens]);

  const boardTokens = useMemo(() => {
    if (!config?.featured?.length) return tokens;
    const feat = new Set(config.featured.map((f) => f.address.toLowerCase()));
    return tokens.filter((t) => !feat.has(t.address.toLowerCase()));
  }, [tokens, config]);

  const totals = useMemo(() => {
    const vol = tokens.reduce((s, t) => s + (t.volume24h ?? 0), 0);
    const mcap = tokens.reduce((s, t) => s + (t.marketCap ?? 0), 0);
    return { vol, mcap, n: tokens.length };
  }, [tokens]);

  if (config?.maintenanceMode) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-amber-100">Under maintenance</h1>
        <p className="mt-2 text-sm text-amber-100/70">
          We&apos;ll be back shortly.
        </p>
      </div>
    );
  }

  const ann = config?.announcement;
  const toneClass =
    ann?.tone === "warn"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
      : ann?.tone === "success"
        ? "border-[#00c805]/40 bg-[#00c805]/10 text-[#b8f5b8]"
        : "border-sky-500/30 bg-sky-500/10 text-sky-100";

  return (
    <div className="space-y-6">
      {ann?.enabled && ann.text && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${toneClass}`}>
          {ann.href ? (
            <a href={ann.href} target="_blank" rel="noreferrer" className="hover:underline">
              {ann.text}
            </a>
          ) : (
            ann.text
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {config?.heroTitle || "Robinhood trenches"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/50">
            {config?.heroSubtitle ||
              "Live memecoins on Robinhood Chain — launch and trade on HoodMemes."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-white/45">
          <Stat label="Tokens" value={String(totals.n)} />
          <Stat label="Σ MCAP" value={formatUsd(totals.mcap)} />
          <Stat label="Σ VOL 24h" value={formatUsd(totals.vol)} />
        </div>
      </div>

      {featuredCards.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#00c805]">
            {config?.featuredSectionTitle || "Featured"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCards.map((t) => (
              <div key={t.address.toLowerCase()} className="relative">
                <div className="absolute -top-2 left-3 z-10 rounded bg-[#00c805] px-1.5 py-0.5 text-[10px] font-bold text-black">
                  FEATURED
                </div>
                <TokenCard token={t} />
              </div>
            ))}
          </div>
        </section>
      )}

      {config?.showDexBoard !== false && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, ticker, or address…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00c805]/50 focus:ring-1 focus:ring-[#00c805]/30"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    sort === s.key
                      ? "bg-[#00c805] text-black"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <button
                type="button"
                onClick={load}
                className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
              >
                Refresh
              </button>
            </div>
          </div>

          {updatedAt && (
            <p className="text-[11px] text-white/30">
              Updated {new Date(updatedAt).toLocaleTimeString()} · DexScreener ·
              chain 4663
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {loading && boardTokens.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl bg-white/5"
                />
              ))}
            </div>
          ) : boardTokens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-white/40">
              No tokens matched.{" "}
              <Link href="/create" className="text-[#00c805]">
                Launch one
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {boardTokens.map((t) => (
                <TokenCard key={t.address.toLowerCase()} token={t} />
              ))}
            </div>
          )}
        </>
      )}

      {(config?.social.twitter ||
        config?.social.telegram ||
        config?.social.discord) && (
        <div className="flex flex-wrap gap-3 border-t border-white/5 pt-4 text-xs text-white/40">
          {config.social.twitter && (
            <a href={config.social.twitter} target="_blank" rel="noreferrer" className="hover:text-[#00c805]">
              Twitter
            </a>
          )}
          {config.social.telegram && (
            <a href={config.social.telegram} target="_blank" rel="noreferrer" className="hover:text-[#00c805]">
              Telegram
            </a>
          )}
          {config.social.discord && (
            <a href={config.social.discord} target="_blank" rel="noreferrer" className="hover:text-[#00c805]">
              Discord
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/35">
        {label}
      </div>
      <div className="font-semibold text-white/90">{value}</div>
    </div>
  );
}
