import Link from "next/link";
import type { TokenCardData } from "@/lib/types";
import { formatPct, formatUsd, shortAddr, timeAgo } from "@/lib/format";

export function TokenCard({ token }: { token: TokenCardData }) {
  const up = (token.priceChange24h ?? 0) >= 0;
  const initial = (token.symbol || "?")[0]?.toUpperCase() ?? "?";

  return (
    <Link
      href={`/token/${token.address}`}
      className="group flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-all hover:border-[#00c805]/40 hover:bg-white/[0.06] hover:shadow-[0_0_24px_rgba(0,200,5,0.08)]"
    >
      <div className="flex items-start gap-3">
        {token.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={token.imageUrl}
            alt={token.symbol}
            className="h-12 w-12 rounded-xl object-cover bg-white/5 ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00c805]/30 to-emerald-900/40 text-lg font-black text-[#00c805] ring-1 ring-white/10">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-white">${token.symbol}</span>
            {token.isNative && (
              <span className="rounded bg-[#00c805]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#00c805]">
                HoodFun
              </span>
            )}
          </div>
          <div className="truncate text-xs text-white/40">{token.name}</div>
          <div className="mt-0.5 font-mono text-[10px] text-white/30">
            {shortAddr(token.address)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-white">
            {formatUsd(token.marketCap)}
          </div>
          <div
            className={`text-xs font-medium ${up ? "text-[#00c805]" : "text-rose-400"}`}
          >
            {formatPct(token.priceChange24h)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-[11px]">
        <div>
          <div className="text-white/35">Vol 24h</div>
          <div className="font-medium text-white/80">
            {formatUsd(token.volume24h)}
          </div>
        </div>
        <div>
          <div className="text-white/35">Liq</div>
          <div className="font-medium text-white/80">
            {formatUsd(token.liquidity)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/35">Age</div>
          <div className="font-medium text-white/80">
            {timeAgo(token.createdAt)}
          </div>
        </div>
      </div>
    </Link>
  );
}
