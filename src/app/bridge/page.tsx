import type { Metadata } from "next";
import Link from "next/link";
import { BridgePageClient } from "./BridgePageClient";

export const metadata: Metadata = {
  title: "Bridge to Robinhood Chain",
  description:
    "Bridge ETH to Robinhood Chain with Relay — then trade memecoins on HoodMemes. Fast deposits from Ethereum, Base, Arbitrum, and Optimism.",
  openGraph: {
    title: "Bridge to Robinhood · HoodMemes",
    description:
      "In-page Relay bridge onto Robinhood Chain (4663). Fund your wallet and hit the trenches.",
  },
};

export default function BridgePage() {
  return (
    <div className="mx-auto max-w-5xl py-8 pb-20">
      <div className="mb-8 max-w-xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00c805]">
          Onboarding
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Bridge to Robinhood
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          Move ETH onto Robinhood Chain with{" "}
          <a
            href="https://relay.link"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#00c805] hover:underline"
          >
            Relay
          </a>
          — usually seconds. Then launch or buy memecoins on HoodMemes without
          leaving the trenches.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start">
        <div className="lg:sticky lg:top-20">
          <BridgePageClient />
        </div>

        <div className="space-y-4 text-sm text-white/50">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-base font-black text-white">How it works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 leading-relaxed">
              <li>Connect the wallet that will receive ETH on Robinhood.</li>
              <li>
                Pick any supported <strong className="text-white/70">from</strong>{" "}
                chain (full Relay list — Base, Ethereum, Arbitrum, and many more)
                and an ETH amount.
              </li>
              <li>
                Confirm the Relay deposit in your wallet. Solver fills on RH —
                typically under a minute.
              </li>
              <li>
                Switch network to{" "}
                <strong className="text-white/70">Robinhood (4663)</strong> and
                trade or{" "}
                <Link href="/create" className="text-[#00c805] hover:underline">
                  launch a coin
                </Link>
                .
              </li>
            </ol>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-base font-black text-white">Tips</h2>
            <ul className="mt-3 space-y-2 leading-relaxed">
              <li>
                · Bridge a little extra ETH for gas on Robinhood (fees are tiny
                but nonzero).
              </li>
              <li>
                · Quick wallet and MetaMask use the same address on every chain —
                Relay sends to the address you connect here.
              </li>
              <li>
                · Prefer the full Relay app if your origin chain isn&apos;t listed
                in the panel.
              </li>
              <li>
                · Official network: RPC{" "}
                <code className="text-[11px] text-white/40">
                  rpc.mainnet.chain.robinhood.com
                </code>{" "}
                · chain ID <strong className="text-white/70">4663</strong>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <h2 className="text-base font-black text-white">Next steps</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/create"
                className="rounded-xl bg-[#00c805] px-4 py-2 text-sm font-black text-black"
              >
                Launch a coin
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5"
              >
                Board
              </Link>
              <Link
                href="/how-it-works"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5"
              >
                How it works
              </Link>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-white/35">
              Bridging is provided by Relay (third-party). HoodMemes does not
              custody your funds. Not financial advice. Always verify the
              destination address and chain before sending.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
