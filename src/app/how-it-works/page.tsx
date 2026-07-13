import type { Metadata } from "next";
import Link from "next/link";
import { AddNetworkButton } from "@/components/AddNetworkButton";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How HoodMemes launches work on Robinhood Chain — supply, creator allocation, Uniswap LP.",
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-black text-white">How HoodMemes works</h1>
        <p className="mt-2 text-sm text-white/45">
          Instant Uniswap V3 launches on Robinhood Chain. No bonding curve — straight to a locked pool.
        </p>
      </div>

      <ol className="space-y-4">
        {[
          {
            t: "Pick identity",
            d: "Name, ticker, optional socials (X, TG, site). Verified X badge available from Account.",
          },
          {
            t: "Fixed supply + creator cut",
            d: "Choose 1B–1T supply. Creator allocation is 0% (fair), 1%, 5%, or 10% max. Rest goes to the pool.",
          },
          {
            t: "Seed liquidity",
            d: "You pay initial-buy ETH (min 0.01) + small launch fee. 100% supply seeds a Uni V3 pool (locked); your ETH buys first.",
          },
          {
            t: "LP burn or keep",
            d: "Burn LP = locked forever (best trust). Keep LP = you can remove later and recover ETH.",
          },
          {
            t: "Trade & share",
            d: "Token is live on Uniswap immediately. Share CA + token page. DexScreener indexes when ready.",
          },
        ].map((s, i) => (
          <li
            key={s.t}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="text-[10px] font-bold text-[#00c805]">
              Step {i + 1}
            </div>
            <div className="text-lg font-black text-white">{s.t}</div>
            <p className="mt-1 text-sm text-white/45">{s.d}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/50">
        <strong className="text-white/80">Important:</strong> Market cap on
        charts is not cash you can withdraw. Recoverable capital if you Keep LP ≈
        remaining pool ETH (minus fees/gas). Memecoins can go to zero.
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2 text-sm text-white/50">
        <h2 className="text-base font-black text-white">Legit stack</h2>
        <p>
          <strong className="text-white/80">1.</strong> Logo + socials on
          HoodMemes (free, automatic on launch).
        </p>
        <p>
          <strong className="text-white/80">2.</strong> Public{" "}
          <Link href="/tokenlist" className="text-[#00c805] hover:underline">
            token list
          </Link>{" "}
          for wallets/apps that import custom lists.
        </p>
        <p>
          <strong className="text-white/80">3.</strong> Optional paid{" "}
          <a
            href="https://marketplace.dexscreener.com/product/token-info"
            className="text-[#00c805] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            DexScreener Enhanced Token Info
          </a>{" "}
          if you want the logo on Dex itself (no free API).
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/create"
          className="rounded-xl bg-[#00c805] px-5 py-2.5 text-sm font-black text-black"
        >
          Launch a coin
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80"
        >
          Board
        </Link>
        <AddNetworkButton />
      </div>
    </div>
  );
}
