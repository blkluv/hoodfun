"use client";

import { CreateForm } from "@/components/CreateForm";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import type { SiteConfig } from "@/lib/site-config";
import Link from "next/link";

export default function CreatePage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  if (config?.maintenanceMode) {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-6 py-20 text-center">
        <h1 className="text-2xl font-black text-amber-100">Maintenance</h1>
        <p className="mt-2 text-sm text-amber-100/70">
          Launches are temporarily offline.
        </p>
      </div>
    );
  }

  if (config && !config.launchesEnabled) {
    return (
      <div className="hm-glass rounded-3xl px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-white/80">Launches paused</h1>
        <p className="mt-2 text-sm text-white/40">
          Check back soon or browse the{" "}
          <Link href="/" className="text-[#ccff00]">
            board
          </Link>
          .
        </p>
      </div>
    );
  }

  const form =
    config?.requireLoginToLaunch !== false ? (
      <RequireAuth
        title="Log in to launch"
        blurb="Connect MetaMask or open a quick wallet. Your keys stay on your device."
      >
        <CreateForm />
      </RequireAuth>
    ) : (
      <CreateForm />
    );

  return (
    <div className="relative -mx-4 sm:mx-0">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 px-4 pb-12 pt-6 sm:px-0">
        <div className="hm-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -left-24 -top-10 h-72 w-72 rounded-full bg-[#ccff00]/18 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-[#ccff00]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-[#ccff00]/5 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ccff00]/35 bg-[#ccff00]/12 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#ccff00] shadow-[0_0_24px_rgba(204, 255, 0,0.15)]">
            <span className="hm-live-dot h-2 w-2 rounded-full bg-[#ccff00]" />
            Instant Uniswap · Robinhood Chain
          </div>

          <h1 className="text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-br from-white via-white to-[#ccff00] bg-clip-text text-transparent">
              Launch a coin
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#ccff00] via-[#e8ff66] to-white bg-clip-text text-transparent">
              that actually trades
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/50 sm:text-base">
            Fixed 1B supply. One tx → Uniswap V3 pool with{" "}
            <strong className="text-white/70">LP locked forever</strong> (no
            burn/keep choice). Your ETH is the first buy. You earn 50% of swap
            fees for life.
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-2 text-left sm:grid-cols-4 sm:gap-3">
            {[
              {
                n: "01",
                t: "Identity",
                d: "Name, ticker, logo",
              },
              {
                n: "02",
                t: "Authority",
                d: "X, TG, site links",
              },
              {
                n: "03",
                t: "Initial buy",
                d: "ETH → first buy + fee",
              },
              {
                n: "04",
                t: "Go live",
                d: "V3 · LP locked forever",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="group rounded-2xl border border-white/10 bg-black/35 px-3 py-3.5 transition hover:border-[#ccff00]/35 hover:bg-[#ccff00]/5"
              >
                <div className="text-[10px] font-black tracking-wider text-[#ccff00]">
                  {s.n}
                </div>
                <div className="mt-1 text-xs font-black text-white sm:text-sm">
                  {s.t}
                </div>
                <div className="mt-0.5 text-[10px] leading-snug text-white/40">
                  {s.d}
                </div>
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-white/35">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
              LP locked forever
            </span>
            <span className="hidden text-white/15 sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
              50% fees to creator
            </span>
            <span className="hidden text-white/15 sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
              No free creator bag
            </span>
          </div>

          <p className="mx-auto mt-4 max-w-lg text-center text-[11px] text-white/30">
            Full details:{" "}
            <Link href="/how-it-works" className="text-[#ccff00]/80 hover:underline">
              How it works
            </Link>
          </p>
        </div>
      </section>

      <div className="px-4 py-8 sm:px-0">{form}</div>
    </div>
  );
}
