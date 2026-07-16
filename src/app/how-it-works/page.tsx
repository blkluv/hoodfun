import type { Metadata } from "next";
import Link from "next/link";
import { AddNetworkButton } from "@/components/AddNetworkButton";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How HoodMemes V3 launches work on Robinhood Chain — one tx, Uniswap V3, LP locked forever, creator fees.",
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-black text-white">How HoodMemes works</h1>
        <p className="mt-2 text-sm text-white/45">
          Instant Uniswap V3 launches on Robinhood Chain. No bonding curve. No
          “graduate later.” Real pool from the first transaction.
        </p>
      </div>

      <div className="rounded-2xl border border-[#ccff00]/35 bg-[#ccff00]/10 p-4 text-sm text-white/80">
        <strong className="text-[#ccff00]">LP is always locked forever.</strong>{" "}
        There is no “burn LP” or “keep LP” toggle. The Uniswap V3 position NFT
        goes to the HoodMemes locker and cannot be withdrawn. You only claim
        trading fees (50% creator / 50% protocol).
      </div>

      <ol className="space-y-4">
        {[
          {
            t: "Pick identity",
            d: "Name, ticker, logo, optional socials (X, TG, site). Verify X from Account for a badge on your token page.",
          },
          {
            t: "Fixed 1B supply",
            d: "Every V3 launch mints a fixed 1 billion tokens. There is no free creator allocation — you buy your bag with ETH in the same launch tx.",
          },
          {
            t: "One transaction launches everything",
            d: "In a single tx: token deploys → 100% supply seeds a Uni V3 1% TOKEN/ETH pool (single-sided) → LP NFT locked in the permanent locker → your ETH (minus a small launch fee) buys tokens as the first trade → short anti-snipe window (2% max wallet ~366 blocks).",
          },
          {
            t: "LP locked forever — not optional",
            d: "Liquidity cannot be removed by the creator or the platform. That is intentional trust: no rug-via-LP-pull. Your upside as creator is 50% of pool swap fees for life (claim from Account or the token page).",
          },
          {
            t: "Trade & get indexed",
            d: "Token is live on Uniswap immediately — Fomo, DexScreener, and bots that cover Robinhood Chain can pick it up. Share your CA + hoodmemes.fun/token/… page.",
          },
        ].map((s, i) => (
          <li
            key={s.t}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="text-[10px] font-bold text-[#ccff00]">
              Step {i + 1}
            </div>
            <div className="text-lg font-black text-white">{s.t}</div>
            <p className="mt-1 text-sm text-white/45">{s.d}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-[#ccff00]/25 bg-[#ccff00]/[0.06] p-5 space-y-2 text-sm text-white/55">
        <h2 className="text-base font-black text-white">Launch Health Score</h2>
        <p>
          Every token page shows a community-requested{" "}
          <strong className="text-white/80">Launch Health</strong> grade (A–F)
          from four signals: LP status, creator allocation, liquidity, and
          wallet concentration. It helps you scan faster — it is{" "}
          <strong className="text-white/80">not</strong> financial advice or a
          safety guarantee. Still DYOR.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-3 text-sm text-white/50">
        <h2 className="text-base font-black text-white">What you pay / earn</h2>
        <ul className="space-y-2 list-disc pl-4">
          <li>
            <strong className="text-white/75">Launch fee</strong> — 0.0005 ETH to
            protocol (one-time).
          </li>
          <li>
            <strong className="text-white/75">Initial buy</strong> — min 0.01 ETH;
            becomes your token bag from the new pool (same tx).
          </li>
          <li>
            <strong className="text-white/75">Pool fee</strong> — 1% on every
            swap. Of fees collected from the locked LP:{" "}
            <strong className="text-white/75">50% creator</strong>,{" "}
            <strong className="text-white/75">50% protocol</strong>.
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/50">
        <strong className="text-white/80">Important:</strong> Market cap on charts
        is not cash you can withdraw. LP ETH stays in the pool forever. You can
        sell tokens you bought or claim trading fees — you cannot pull the
        liquidity. Memecoins can go to zero.
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2 text-sm text-white/50">
        <h2 className="text-base font-black text-white">Legit stack</h2>
        <p>
          <strong className="text-white/80">1.</strong> Logo + socials on
          HoodMemes (set at launch).
        </p>
        <p>
          <strong className="text-white/80">2.</strong> Public{" "}
          <Link href="/tokenlist" className="text-[#ccff00] hover:underline">
            token list
          </Link>{" "}
          for wallets/apps that import custom lists.
        </p>
        <p>
          <strong className="text-white/80">3.</strong> Optional paid{" "}
          <a
            href="https://marketplace.dexscreener.com/product/token-info"
            className="text-[#ccff00] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            DexScreener Enhanced Token Info
          </a>{" "}
          if you want the logo on Dex itself.
        </p>
        <p>
          <strong className="text-white/80">4.</strong> Claim creator fees from{" "}
          <Link href="/account" className="text-[#ccff00] hover:underline">
            Account
          </Link>{" "}
          after volume hits your pool.
        </p>
        <p>
          <strong className="text-white/80">5.</strong> On-site{" "}
          <strong className="text-white/80">community chat</strong> on every
          token page (wallet login to post · no links · anti-scam).
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/create"
          className="rounded-xl bg-[#ccff00] px-5 py-2.5 text-sm font-black text-black"
        >
          Launch a coin
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80"
        >
          Board
        </Link>
        <Link
          href="/contact"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80"
        >
          Contact
        </Link>
        <a
          href="mailto:admin@hoodmemes.fun"
          className="rounded-xl border border-[#ccff00]/30 px-5 py-2.5 text-sm font-semibold text-[#ccff00]"
        >
          admin@hoodmemes.fun
        </a>
        <AddNetworkButton />
      </div>
    </div>
  );
}
