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
          <Link href="/" className="text-[#00c805]">
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
      <section className="relative overflow-hidden border-b border-white/5 px-4 pb-10 pt-4 sm:px-0">
        <div className="hm-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#00c805]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00c805]/30 bg-[#00c805]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#00c805]">
            <span className="hm-live-dot h-2 w-2 rounded-full bg-[#00c805]" />
            Instant Uniswap · Robinhood Chain
          </div>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-white via-white to-[#00c805] bg-clip-text text-transparent">
              Launch your coin
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/45 sm:text-base">
            Fixed supply. Seed liquidity. Live on Uniswap in one transaction.
            Add your socials so the trenches know you&apos;re real.
          </p>

          <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2 text-left sm:gap-3">
            {[
              { n: "01", t: "Identity", d: "Name, ticker, socials" },
              { n: "02", t: "Supply & LP", d: "1B–1T · your ETH" },
              { n: "03", t: "Go live", d: "Uni pool · DexScreener" },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/8 bg-black/30 px-3 py-3"
              >
                <div className="text-[10px] font-bold text-[#00c805]">{s.n}</div>
                <div className="mt-0.5 text-xs font-bold text-white">{s.t}</div>
                <div className="mt-0.5 text-[10px] text-white/35">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="px-4 py-8 sm:px-0">{form}</div>
    </div>
  );
}
