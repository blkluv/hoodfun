import Link from "next/link";
import type { TokenCardData } from "@/lib/types";
import { formatPct, formatUsd, shortAddr, timeAgo } from "@/lib/format";

export function TokenCard({
  token,
  rank,
  badge,
  index = 0,
}: {
  token: TokenCardData;
  rank?: number;
  badge?: string;
  index?: number;
}) {
  const up = (token.priceChange24h ?? 0) >= 0;
  const up1h = (token.priceChange1h ?? 0) >= 0;
  const initial = (token.symbol || "?")[0]?.toUpperCase() ?? "?";
  const buys = token.buys24h ?? 0;
  const sells = token.sells24h ?? 0;
  const total = buys + sells || 1;
  const buyPct = Math.round((buys / total) * 100);

  return (
    <Link
      href={`/token/${token.address}`}
      className="hm-card-in group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#00c805]/50 hover:shadow-[0_12px_40px_rgba(0,200,5,0.15)]"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      {/* glow corner */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#00c805]/10 blur-2xl transition group-hover:bg-[#00c805]/25" />

      <div className="relative flex items-start gap-3">
        <div className="relative shrink-0">
          {token.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.imageUrl}
              alt={token.symbol}
              className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/10 transition group-hover:ring-[#00c805]/40"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00c805]/40 to-emerald-950 text-xl font-black text-[#00c805] ring-2 ring-white/10">
              {initial}
            </div>
          )}
          {rank != null && rank <= 3 && (
            <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#00c805] text-[10px] font-black text-black shadow-lg">
              {rank}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-base font-black tracking-tight text-white">
              ${token.symbol}
            </span>
            {badge && (
              <span className="shrink-0 rounded-md bg-[#00c805]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#00c805]">
                {badge}
              </span>
            )}
            {token.isNative && (
              <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/70">
                HM
              </span>
            )}
          </div>
          <div className="truncate text-xs text-white/40">{token.name}</div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-white/25">
            <span>{shortAddr(token.address)}</span>
            <span>·</span>
            <span>{timeAgo(token.createdAt)}</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-black tabular-nums text-white">
            {formatUsd(token.marketCap)}
          </div>
          <div
            className={`text-xs font-bold tabular-nums ${up ? "text-[#00c805]" : "text-rose-400"}`}
          >
            {formatPct(token.priceChange24h)}
          </div>
          <div
            className={`text-[10px] tabular-nums ${up1h ? "text-[#00c805]/70" : "text-rose-400/70"}`}
          >
            1h {formatPct(token.priceChange1h)}
          </div>
        </div>
      </div>

      {/* buy/sell bar */}
      <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-rose-500/30">
        <div
          className="h-full rounded-full bg-[#00c805] transition-all"
          style={{ width: `${buyPct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/35">
        <span className="text-[#00c805]/80">{buyPct}% buys</span>
        <span className="text-rose-400/80">{100 - buyPct}% sells</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-[11px]">
        <div>
          <div className="text-white/30">Vol 24h</div>
          <div className="font-semibold tabular-nums text-white/90">
            {formatUsd(token.volume24h)}
          </div>
        </div>
        <div>
          <div className="text-white/30">Liq</div>
          <div className="font-semibold tabular-nums text-white/90">
            {formatUsd(token.liquidity)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/30">Txns</div>
          <div className="font-semibold tabular-nums text-white/90">
            {token.txns24h?.toLocaleString() ?? "—"}
          </div>
        </div>
      </div>
    </Link>
  );
}
