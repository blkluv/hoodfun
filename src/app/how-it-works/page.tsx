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
          Instant Uniswap V2 launches on Robinhood Chain. No long bonding wait.
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
            d: "You pay LP ETH (min 0.01) + small create fee. Tokens + your ETH form a Uniswap V2 pair in one tx.",
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
