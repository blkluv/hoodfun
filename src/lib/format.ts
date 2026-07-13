export function formatUsd(n: number | null | undefined, compact = true): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (!compact) {
    return formatPrice(n);
  }
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (abs >= 1) return `$${n.toFixed(2)}`;
  if (abs >= 0.0001) return `$${n.toFixed(4)}`;
  if (abs === 0) return "$0";
  return formatPrice(n);
}

/** Meme-friendly price formatting for very small values */
export function formatPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "$0";
  if (abs >= 1000) return formatUsd(n, true);
  if (abs >= 1) return `$${n.toFixed(2)}`;
  if (abs >= 0.01) return `$${n.toFixed(4)}`;
  if (abs >= 0.0001) return `$${n.toFixed(6)}`;
  // 0.00000003328 → $0.0₇3328 style-ish readable
  const s = abs.toFixed(12).replace(/0+$/, "");
  const m = s.match(/^0\.(0*)([1-9]\d{0,3})/);
  if (m) {
    const zeros = m[1].length;
    if (zeros >= 4) {
      return `$0.0${subscript(zeros)}${m[2]}`;
    }
  }
  return `$${abs.toPrecision(4)}`;
}

function subscript(n: number): string {
  const map = "₀₁₂₃₄₅₆₇₈₉";
  return String(n)
    .split("")
    .map((d) => map[Number(d)] ?? d)
    .join("");
}

export function formatSupply(raw: string | number | bigint | null | undefined): string {
  if (raw == null) return "—";
  const n = typeof raw === "bigint" ? Number(raw) / 1e18 : Number(raw) / (Number(raw) > 1e15 ? 1e18 : 1);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(n % 1e12 === 0 ? 0 : 1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function shortAddr(addr: string, n = 4): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 2 + n)}…${addr.slice(-n)}`;
}

export function timeAgo(ts: number | null): string {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
