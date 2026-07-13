import type { Metadata } from "next";
import Link from "next/link";
import { BridgePageClient } from "./BridgePageClient";

export const metadata: Metadata = {
  title: "Bridge to Robinhood Chain",
  description:
    "Bridge ETH to Robinhood Chain with Relay — then trade memecoins on HoodMemes. Fast deposits from dozens of chains.",
  openGraph: {
    title: "Bridge to Robinhood · HoodMemes",
    description:
      "In-page Relay bridge onto Robinhood Chain (4663). Fund your wallet and hit the trenches.",
  },
};

export default function BridgePage() {
  return (
    <div className="relative pb-20">
      {/* Hero background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00c805]/12 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 h-[320px] w-[640px] -translate-x-1/2 rounded-full bg-[#00c805]/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,200,5,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,5,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl px-0 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8 text-center sm:mb-10">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00c805]/30 bg-[#00c805]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#00c805]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00c805]" />
              Powered by Relay
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
            Bridge to{" "}
            <span className="bg-gradient-to-r from-[#00c805] to-[#6dff71] bg-clip-text text-transparent">
              Robinhood
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/50 sm:text-base">
            Fund your wallet in seconds — then launch or ape on HoodMemes.
            Same address receives ETH on chain 4663.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:items-start">
          {/* Widget */}
          <div className="relative lg:sticky lg:top-20">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#00c805]/40 via-[#00c805]/10 to-transparent opacity-80 blur-[1px]" />
            <div className="relative overflow-hidden rounded-2xl border border-[#2a2f37] bg-[#12161c]/95 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="border-b border-[#2a2f37] bg-[#171b21]/80 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://assets.relay.link/icons/4663/light.png"
                      alt="Robinhood Chain"
                      width={28}
                      height={28}
                      className="rounded-full ring-1 ring-[#2a2f37]"
                    />
                    <div>
                      <div className="text-sm font-bold text-white">
                        Deposit ETH
                      </div>
                      <div className="text-[10px] text-white/40">
                        Destination · Robinhood Chain
                      </div>
                    </div>
                  </div>
                  <a
                    href="https://relay.link"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/45 hover:text-[#00c805]"
                  >
                    Relay ↗
                  </a>
                </div>
              </div>
              <div className="p-4">
                <BridgePageClient />
              </div>
            </div>
          </div>

          {/* Side content */}
          <div className="space-y-4">
            {/* Route visual */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Typical route
              </h2>
              <div className="mt-4 flex items-center justify-center gap-3 sm:gap-5">
                {(
                  [
                    [1, "ETH"],
                    [8453, "Base"],
                    [42161, "Arb"],
                  ] as const
                ).map(([id, label]) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={id} className="flex flex-col items-center gap-1.5">
                    <img
                      src={`https://assets.relay.link/icons/${id}/light.png`}
                      alt={label}
                      width={40}
                      height={40}
                      className="rounded-full ring-2 ring-white/10"
                    />
                    <span className="text-[10px] font-semibold text-white/45">
                      {label}
                    </span>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-1 px-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00c805]/15 text-[#00c805]">
                    →
                  </div>
                  <span className="text-[9px] text-white/30">Relay</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://assets.relay.link/icons/4663/light.png"
                    alt="Robinhood"
                    width={48}
                    height={48}
                    className="rounded-full ring-2 ring-[#00c805]/50 shadow-[0_0_24px_rgba(0,200,5,0.35)]"
                  />
                  <span className="text-[10px] font-bold text-[#00c805]">
                    RH 4663
                  </span>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-white/40">
                + dozens more origin chains in the selector
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-base font-black text-white">How it works</h2>
              <ol className="mt-4 space-y-3">
                {[
                  {
                    n: "01",
                    t: "Connect",
                    d: "Use MetaMask or your HoodMemes quick wallet — same address on every chain.",
                  },
                  {
                    n: "02",
                    t: "Choose origin + amount",
                    d: "Pick any Relay-supported chain and how much ETH to move.",
                  },
                  {
                    n: "03",
                    t: "Confirm deposit",
                    d: "Sign once. Relay solvers fill on Robinhood in seconds.",
                  },
                  {
                    n: "04",
                    t: "Trade or launch",
                    d: "Switch to Robinhood (4663) and hit the trenches.",
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-3">
                    <span className="font-mono text-xs font-bold text-[#00c805]">
                      {s.n}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white">{s.t}</div>
                      <p className="text-xs leading-relaxed text-white/45">
                        {s.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  t: "Seconds, not days",
                  d: "Intent fills — no 7-day canonical wait for deposits.",
                },
                {
                  t: "Extra gas recommended",
                  d: "Bridge a bit more ETH so you can swap / launch immediately.",
                },
                {
                  t: "Chain ID 4663",
                  d: "rpc.mainnet.chain.robinhood.com — add via Account if needed.",
                },
                {
                  t: "Non-custodial",
                  d: "Relay executes; HoodMemes never holds your funds.",
                },
              ].map((c) => (
                <div
                  key={c.t}
                  className="rounded-xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="text-sm font-bold text-white">{c.t}</div>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">
                    {c.d}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-[#00c805]/25 bg-[#00c805]/[0.06] p-5">
              <h2 className="text-base font-black text-white">Ready?</h2>
              <p className="mt-1 text-xs text-white/50">
                After your balance lands, launch a coin or browse the board.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/create"
                  className="rounded-xl bg-[#00c805] px-4 py-2.5 text-sm font-black text-black shadow-[0_0_24px_rgba(0,200,5,0.25)]"
                >
                  Launch a coin
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/5"
                >
                  Board
                </Link>
                <Link
                  href="/how-it-works"
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/5"
                >
                  How it works
                </Link>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-white/35">
                Bridging via Relay (third-party). Not financial advice. Always
                verify destination address and chain ID <strong>4663</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
