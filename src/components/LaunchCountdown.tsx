"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SiteConfig } from "@/lib/site-config";

type Parts = { d: number; h: number; m: number; s: number; done: boolean };

function split(ms: number): Parts {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s, done: false };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function useCountdown(targetMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => split(targetMs - now), [targetMs, now]);
}

function Unit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[4.25rem] flex-col items-center sm:min-w-[5.5rem]">
      <div className="relative w-full overflow-hidden rounded-2xl border border-black/20 bg-black/90 px-2 py-3 shadow-[0_0_40px_rgba(204,255,0,0.15)] sm:px-3 sm:py-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="relative text-center font-black tabular-nums leading-none tracking-tight text-[#ccff00] text-[1.75rem] sm:text-4xl md:text-5xl">
          {value}
        </div>
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-black/55 sm:text-[11px]">
        {label}
      </div>
    </div>
  );
}

/** Full homepage hero-style countdown */
export function LaunchCountdownHero({
  launch,
}: {
  launch: SiteConfig["officialLaunch"];
}) {
  const t = useCountdown(launch.at);
  if (!launch.enabled) return null;

  return (
    <section
      id="official-launch"
      className="relative overflow-hidden border-b border-[#ccff00]/40 bg-[#ccff00]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-black/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-black">
            <span className="hm-live-dot h-2 w-2 rounded-full bg-black" />
            Official launch
          </span>
          <span className="rounded-full border border-black/10 bg-white/30 px-3 py-1 text-[11px] font-bold text-black/70">
            Robinhood Chain
          </span>
        </div>

        <h2 className="text-center text-3xl font-black tracking-tight text-black sm:text-5xl md:text-6xl">
          {launch.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-semibold leading-relaxed text-black/65 sm:text-base">
          {launch.subtitle}
        </p>

        {t.done ? (
          <div className="mx-auto mt-10 max-w-xl rounded-3xl border-2 border-black/20 bg-black px-6 py-8 text-center shadow-2xl">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ccff00]">
              Live now
            </div>
            <div className="mt-2 text-3xl font-black text-white sm:text-4xl">
              $HOODMEMES is live
            </div>
            <p className="mt-2 text-sm text-white/50">
              CA only from the official account. Verify before you ape.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={launch.ctaHref || "https://x.com/hoodmemesdotfun"}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-[#ccff00] px-6 py-3 text-sm font-black text-black"
              >
                Get CA on X →
              </a>
              <Link
                href="/"
                className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-bold text-white"
              >
                Board
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-end justify-center gap-2 sm:gap-3 md:gap-4">
              {t.d > 0 && (
                <>
                  <Unit label="Days" value={pad(t.d)} />
                  <span className="mb-8 hidden text-3xl font-black text-black/30 sm:mb-10 sm:block sm:text-4xl">
                    :
                  </span>
                </>
              )}
              <Unit label="Hours" value={pad(t.h)} />
              <span className="mb-8 hidden text-3xl font-black text-black/30 sm:mb-10 sm:block sm:text-4xl">
                :
              </span>
              <Unit label="Minutes" value={pad(t.m)} />
              <span className="mb-8 hidden text-3xl font-black text-black/30 sm:mb-10 sm:block sm:text-4xl">
                :
              </span>
              <Unit label="Seconds" value={pad(t.s)} />
            </div>
            <p className="mt-4 text-center text-xs font-black uppercase tracking-[0.2em] text-black/55">
              {t.d > 0 ? "Counting down to launch" : "Final 24 hours"}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={launch.ctaHref || "https://x.com/hoodmemesdotfun"}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-black px-7 py-3.5 text-sm font-black text-[#ccff00] shadow-lg transition hover:scale-[1.02]"
              >
                {launch.ctaLabel || "Follow for CA"}
              </a>
              <Link
                href="/airdrop"
                className="rounded-2xl border-2 border-black/20 bg-white/40 px-6 py-3.5 text-sm font-black text-black transition hover:bg-white/60"
              >
                Airdrop rules
              </Link>
              <Link
                href="/create"
                className="rounded-2xl border-2 border-black/15 px-5 py-3.5 text-sm font-bold text-black/70 hover:text-black"
              >
                Launch a coin
              </Link>
            </div>

            <p className="mt-6 text-center text-[11px] font-semibold text-black/45">
              Target:{" "}
              {new Date(launch.at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · Not financial advice · DYOR
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/** Slim sticky bar under header */
export function LaunchCountdownBar({
  launch,
}: {
  launch: SiteConfig["officialLaunch"];
}) {
  const t = useCountdown(launch.at);
  if (!launch.enabled || t.done) return null;

  const label =
    t.d > 0
      ? `${t.d}d ${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`
      : `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`;

  return (
    <div className="sticky top-0 z-[45] border-b border-black/20 bg-[#ccff00] shadow-[0_4px_30px_rgba(204,255,0,0.35)]">
      <a
        href="#official-launch"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 py-2.5 text-center sm:justify-between sm:px-4"
      >
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-black sm:text-xs">
          ● Official $HOODMEMES launch
        </span>
        <span className="font-mono text-base font-black tabular-nums tracking-tight text-black sm:text-lg">
          {label}
        </span>
        <span className="hidden text-[11px] font-bold text-black/70 sm:inline">
          Tap for details →
        </span>
      </a>
    </div>
  );
}

/** Loads config and renders sticky bar site-wide */
export function OfficialLaunchChrome() {
  const [launch, setLaunch] = useState<SiteConfig["officialLaunch"] | null>(
    null
  );

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((c: SiteConfig) => {
        if (c?.officialLaunch?.enabled) setLaunch(c.officialLaunch);
      })
      .catch(() => null);
  }, []);

  if (!launch?.enabled) return null;
  return <LaunchCountdownBar launch={launch} />;
}
