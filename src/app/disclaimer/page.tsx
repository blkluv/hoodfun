import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "HoodMemes risk disclaimer and affiliation notice.",
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 text-sm leading-relaxed text-white/55">
      <h1 className="text-3xl font-black text-white">Disclaimer</h1>
      <p>
        HoodMemes is an independent interface for launching and discovering
        memecoins on Robinhood Chain.{" "}
        <strong className="text-white/80">
          Not affiliated with Robinhood Markets, Inc.
        </strong>
      </p>
      <p>
        Nothing on this site is financial, investment, legal, or tax advice.
        Tokens launched or listed here can lose all value. Liquidity may be
        thin, removable, or manipulated. Smart contracts and third-party apps
        (Uniswap, wallets, bridges) carry risk.
      </p>
      <p>
        Always verify contract addresses, creator allocation, and LP status
        before trading. Do your own research (DYOR). Only use funds you can
        afford to lose.
      </p>
      <p>
        By using HoodMemes you accept these risks and that the operators are
        not liable for losses from launches, trades, bugs, or downtime.
      </p>
      <p>
        Contact:{" "}
        <a
          href="mailto:admin@hoodmemes.fun"
          className="font-semibold text-[#ccff00] hover:underline"
        >
          admin@hoodmemes.fun
        </a>{" "}
        ·{" "}
        <Link href="/contact" className="font-semibold text-[#ccff00] hover:underline">
          Contact form
        </Link>
      </p>
      <Link href="/" className="inline-block font-semibold text-[#ccff00]">
        ← Back to board
      </Link>
    </div>
  );
}
