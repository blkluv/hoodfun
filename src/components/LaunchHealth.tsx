"use client";

import { useEffect, useState } from "react";
import type {
  LaunchHealth as Health,
  HealthPillar,
} from "@/lib/launch-health-shared";
import { quickHealthFromCard } from "@/lib/launch-health-shared";
import type { TokenCardData } from "@/lib/types";

function gradeColor(grade: string) {
  switch (grade) {
    case "A":
      return "bg-[#ccff00] text-black";
    case "B":
      return "bg-[#ccff00]/80 text-black";
    case "C":
      return "bg-amber-400 text-black";
    case "D":
      return "bg-orange-500 text-white";
    default:
      return "bg-rose-500/90 text-white";
  }
}

function toneClass(tone: HealthPillar["tone"]) {
  switch (tone) {
    case "green":
      return "border-[#ccff00]/30 bg-[#ccff00]/10 text-[#e8ff99]";
    case "amber":
      return "border-amber-400/30 bg-amber-400/10 text-amber-100";
    case "red":
      return "border-rose-400/30 bg-rose-500/10 text-rose-100";
    default:
      return "border-white/10 bg-white/5 text-white/50";
  }
}

/** Full panel for token page */
export function LaunchHealthPanel({ token }: { token: string }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/health?token=${token}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load health score");
        return r.json();
      })
      .then((j) => {
        if (!cancelled) setHealth(j.health as Health);
      })
      .catch((e) => {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[#2a2f37] bg-[#171b21] p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (err || !health) {
    return (
      <div className="rounded-lg border border-[#2a2f37] bg-[#171b21] p-3 text-[11px] text-[#9aa3ab]">
        Launch Health unavailable{err ? ` — ${err}` : ""}.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#ccff00]/25 bg-gradient-to-b from-[#ccff00]/[0.08] to-[#171b21] p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#ccff00]">
            Launch Health
          </div>
          <div className="mt-1 text-sm font-semibold text-[#e8eaed]">
            {health.label}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-lg px-2.5 py-1 text-lg font-black tabular-nums ${gradeColor(health.grade)}`}
          >
            {health.grade}
          </span>
          <span className="text-[11px] font-bold tabular-nums text-white/50">
            {health.score}/100
          </span>
        </div>
      </button>

      {open && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[#ccff00] transition-all"
              style={{ width: `${health.score}%` }}
            />
          </div>

          <div className="mt-3 grid gap-2">
            {health.pillars.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border px-3 py-2 ${toneClass(p.tone)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">
                    {p.label}
                  </span>
                  <span className="text-[11px] font-black tabular-nums">
                    {p.score}/{p.max} · {p.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug opacity-80">
                  {p.detail}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-white/35">
            {health.disclaimer}
          </p>
        </>
      )}
    </div>
  );
}

/** Compact grade badge for board cards (quick estimate, no holders) */
export function LaunchHealthBadge({
  token,
  full,
}: {
  token: TokenCardData;
  /** if true, try full API (heavier) */
  full?: boolean;
}) {
  const quick = quickHealthFromCard({
    isNative: token.isNative,
    liquidity: token.liquidity,
    source: token.source,
  });
  const [grade, setGrade] = useState(quick.grade);
  const [score, setScore] = useState(quick.score);

  useEffect(() => {
    if (!full && !token.isNative) return;
    let cancelled = false;
    // Full score only for Hood launches to limit RPC load
    if (!token.isNative && !full) return;
    fetch(`/api/health?token=${token.address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.health) {
          setGrade(j.health.grade);
          setScore(j.health.score);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [token.address, token.isNative, full]);

  return (
    <span
      title={`Launch Health ${grade} (${score}/100) — not financial advice`}
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wide ${gradeColor(grade)}`}
    >
      {grade}
    </span>
  );
}
