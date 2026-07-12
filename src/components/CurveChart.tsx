"use client";

import { useMemo } from "react";
import type { CurveSnapshot } from "@/lib/curve";
import { formatUsd } from "@/lib/format";

export function CurveChart({
  curve,
  height = 320,
}: {
  curve: CurveSnapshot;
  height?: number;
}) {
  const { path, area, minP, maxP, points } = useMemo(() => {
    const pts = curve.chart.length
      ? curve.chart
      : [
          { t: Date.now() - 1, priceEth: curve.priceEth, priceUsd: curve.priceUsd },
          { t: Date.now(), priceEth: curve.priceEth, priceUsd: curve.priceUsd },
        ];

    const useUsd = pts.some((p) => p.priceUsd != null && p.priceUsd > 0);
    const values = pts.map((p) =>
      useUsd && p.priceUsd != null ? p.priceUsd : p.priceEth
    );
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min = min * 0.95;
      max = max * 1.05 || 1e-12;
    }
    const pad = (max - min) * 0.08;
    min -= pad;
    max += pad;

    const w = 1000;
    const h = 400;
    const n = pts.length;
    const coords = pts.map((p, i) => {
      const v = useUsd && p.priceUsd != null ? p.priceUsd : p.priceEth;
      const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return { x, y, v, t: p.t };
    });

    const line = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");
    const areaPath =
      line +
      ` L ${coords[coords.length - 1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`;

    return {
      path: line,
      area: areaPath,
      minP: min,
      maxP: max,
      points: coords,
      useUsd,
    };
  }, [curve]);

  const last = curve.chart[curve.chart.length - 1];
  const first = curve.chart[0];
  const lastV = last?.priceUsd ?? last?.priceEth ?? curve.priceEth;
  const firstV = first?.priceUsd ?? first?.priceEth ?? curve.priceEth;
  const up = lastV >= firstV;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0a140c] to-black">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Bonding curve · on-chain
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-black tabular-nums text-white">
              {curve.priceUsd != null
                ? formatUsd(curve.priceUsd, false)
                : `${curve.priceEth.toExponential(3)} ETH`}
            </span>
            <span
              className={`text-sm font-bold ${up ? "text-[#00c805]" : "text-rose-400"}`}
            >
              {curve.trades.length} trades
            </span>
          </div>
        </div>
        <div className="text-right text-[11px] text-white/40">
          {curve.graduated ? (
            <div>
              <span className="font-bold text-[#00c805]">Graduated → Uniswap</span>
              {curve.uniswapPair && (
                <div className="mt-0.5 font-mono text-[10px]">
                  pair {curve.uniswapPair.slice(0, 10)}…
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                Bonding curve · DexScreener after{" "}
                <span className="text-[#00c805]">
                  {curve.graduateThresholdEth || 0.25} ETH
                </span>
              </div>
              <div className="mt-0.5">
                Raised {Number(curve.realEth).toFixed(4)} ETH ·{" "}
                {curve.progressPct.toFixed(1)}% to Uniswap
              </div>
            </>
          )}
          {curve.maxSupply && (
            <div className="mt-0.5">Max supply {curve.maxSupply}</div>
          )}
        </div>
      </div>

      <div className="relative px-2 pb-2 pt-4" style={{ height }}>
        <svg
          viewBox="0 0 1000 400"
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={up ? "#00c805" : "#f43f5e"}
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={up ? "#00c805" : "#f43f5e"}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {/* grid lines */}
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1="0"
              x2="1000"
              y1={400 * g}
              y2={400 * g}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          ))}
          <path d={area} fill="url(#curveFill)" />
          <path
            d={path}
            fill="none"
            stroke={up ? "#00c805" : "#f43f5e"}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="6"
              fill={up ? "#00c805" : "#f43f5e"}
              className="hm-live-dot"
            />
          )}
        </svg>
      </div>

      {/* progress to “graduation” soft target */}
      <div className="border-t border-white/5 px-4 py-3">
        <div className="mb-1.5 flex justify-between text-[11px] text-white/40">
          <span>{curve.graduated ? "Graduated" : "To Uniswap / DexScreener"}</span>
          <span className="text-white/70">
            {curve.progressPct.toFixed(1)}%
            {!curve.graduated && curve.graduateThresholdEth
              ? ` of ${curve.graduateThresholdEth} ETH`
              : ""}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#00a004] to-[#00c805] transition-all"
            style={{ width: `${Math.max(2, curve.progressPct)}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-white/30">
          {curve.graduated
            ? "Liquidity is on Uniswap V2 (LP burned). DexScreener should index the pair shortly."
            : "Fixed max supply. When the raise target hits, liquidity auto-seeds Uniswap and DexScreener can list it."}
        </p>
      </div>
    </div>
  );
}

export function CurveStats({ curve }: { curve: CurveSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label="Price"
        value={
          curve.priceUsd != null
            ? formatUsd(curve.priceUsd, false)
            : `${curve.priceEth.toExponential(2)} ETH`
        }
      />
      <Stat
        label="Market cap"
        value={
          curve.marketCapUsd != null
            ? formatUsd(curve.marketCapUsd)
            : `${curve.marketCapEth.toFixed(4)} ETH`
        }
      />
      <Stat label="Curve ETH" value={`${Number(curve.realEth).toFixed(4)} ETH`} />
      <Stat
        label={curve.maxSupply ? "Max supply" : "Supply"}
        value={curve.maxSupply ?? curve.totalSupply}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/35">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function RecentTrades({ curve }: { curve: CurveSnapshot }) {
  const rows = [...curve.trades].reverse().slice(0, 12);
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-xs text-white/40">
        No curve trades yet — be the first to buy.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-white/8">
      <div className="border-b border-white/8 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Recent curve trades
      </div>
      <div className="max-h-56 overflow-y-auto hm-scroll">
        {rows.map((t, i) => (
          <div
            key={`${t.txHash}-${i}`}
            className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-xs last:border-0"
          >
            <span
              className={
                t.type === "buy" ? "font-bold text-[#00c805]" : "font-bold text-rose-400"
              }
            >
              {t.type.toUpperCase()}
            </span>
            <span className="tabular-nums text-white/70">
              {t.eth.toFixed(5)} ETH
            </span>
            <span className="tabular-nums text-white/40">
              {t.tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
              tokens
            </span>
            {t.txHash && (
              <a
                href={`https://robinhoodchain.blockscout.com/tx/${t.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#00c805]/80 hover:underline"
              >
                tx
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
