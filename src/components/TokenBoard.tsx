"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SortKey, TokenCardData } from "@/lib/types";
import { TokenCard } from "./TokenCard";
import { formatUsd } from "@/lib/format";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "marketCap", label: "Market cap" },
  { key: "volume24h", label: "Volume" },
  { key: "priceChange24h", label: "Gainers" },
  { key: "createdAt", label: "Newest" },
];

export function TokenBoard() {
  const [tokens, setTokens] = useState<TokenCardData[]>([]);
  const [sort, setSort] = useState<SortKey>("marketCap");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/tokens?${params}`);
      if (!res.ok) throw new Error("Failed to load tokens");
      const data = await res.json();
      setTokens(data.tokens ?? []);
      setUpdatedAt(data.updatedAt ?? Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [sort, q]);

  useEffect(() => {
    load();
    const id = setInterval(load, 45_000);
    return () => clearInterval(id);
  }, [load]);

  const totals = useMemo(() => {
    const vol = tokens.reduce((s, t) => s + (t.volume24h ?? 0), 0);
    const mcap = tokens.reduce((s, t) => s + (t.marketCap ?? 0), 0);
    return { vol, mcap, n: tokens.length };
  }, [tokens]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Robinhood trenches
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/50">
            Live memecoins on Robinhood Chain — existing Uniswap pairs plus
            upcoming HoodMemes launches. NOXA paused creates; the board still
            pumps.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-white/45">
          <Stat label="Tokens" value={String(totals.n)} />
          <Stat label="Σ MCAP" value={formatUsd(totals.mcap)} />
          <Stat label="Σ VOL 24h" value={formatUsd(totals.vol)} />
        </div>
      </div>

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
          Updated {new Date(updatedAt).toLocaleTimeString()} · data via
          DexScreener · chain 4663
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading && tokens.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-white/40">
          No tokens matched. Try another search.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((t) => (
            <TokenCard key={t.address.toLowerCase()} token={t} />
          ))}
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
