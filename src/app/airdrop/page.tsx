import type { Metadata } from "next";
import Link from "next/link";
import { AirdropClient } from "./AirdropClient";

export const metadata: Metadata = {
  title: "Airdrop",
  description:
    "$HOODMEMES community airdrop — hold, follow, post. Tiers, multipliers, and how to qualify. CA only from @hoodmemesdotfun.",
  openGraph: {
    title: "HoodMemes Airdrop — $HOODMEMES",
    description:
      "Skin in the game. Louder CT. Bigger bag = bigger drop. Official rules on hoodmemes.fun/airdrop.",
  },
};

const CA = "0xF90147A9594998Ca60FEB247F68Fca5fDE6e515a";
const PAIR = "0x8ccba7d44f3EFD84D733FEd457237c168c3fFC7c";

export default function AirdropPage() {
  return (
    <div className="relative -mx-4 sm:mx-0">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#ccff00]/30 bg-[#ccff00]">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/50 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-black/15 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:36px_36px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-black/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-black">
            <span className="hm-live-dot h-2 w-2 rounded-full bg-black" />
            Community airdrop
          </div>
          <h1 className="text-4xl font-black tracking-tight text-black sm:text-6xl md:text-7xl">
            $HOODMEMES
            <br />
            <span className="text-black/70">Airdrop</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed text-black/65 sm:text-lg">
            Skin in the game. Loud CT. Bigger bag = bigger drop.
            <br className="hidden sm:block" />
            Everyone in the trenches is welcome — just show up.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/token/${CA}?pair=${PAIR}`}
              className="rounded-2xl bg-black px-7 py-3.5 text-sm font-black text-[#ccff00] shadow-lg transition hover:scale-[1.02]"
            >
              Buy $HOODMEMES →
            </Link>
            <a
              href="https://x.com/hoodmemesdotfun"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border-2 border-black/20 bg-white/40 px-6 py-3.5 text-sm font-black text-black hover:bg-white/60"
            >
              Follow @hoodmemesdotfun
            </a>
          </div>
          <AirdropClient ca={CA} />
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        {/* Min hold callout */}
        <section className="rounded-3xl border border-[#ccff00]/35 bg-gradient-to-br from-[#ccff00]/15 via-transparent to-transparent p-6 sm:p-8">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ccff00]">
            Minimum hold
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            $10 <span className="text-white/40">or</span> 1,000,000 tokens
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            At snapshot you need the{" "}
            <strong className="text-white/85">greater of</strong> the two — so
            whichever is{" "}
            <strong className="text-white/85">higher</strong> in practice:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li className="flex gap-2">
              <span className="text-[#ccff00]">▸</span>
              <span>
                <strong className="text-white">$10 USD</strong> worth of
                $HOODMEMES at snapshot price,{" "}
                <strong className="text-white">or</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#ccff00]">▸</span>
              <span>
                <strong className="text-white">1,000,000</strong> $HOODMEMES
                tokens — if that&apos;s worth more than $10, that&apos;s your
                bar
              </span>
            </li>
          </ul>
          <p className="mt-4 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[12px] text-white/45">
            Example: if 1M tokens ≈ $3, you still need ~$10 of tokens. If 1M
            tokens ≈ $50, holding 1M already clears the floor. Same idea scales
            for higher tiers.
          </p>
        </section>

        {/* Base criteria */}
        <section>
          <h2 className="text-xl font-black text-white sm:text-2xl">
            Base eligibility
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Hit all three and you&apos;re in the pool.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Hold the floor",
                d: "≥ max($10, 1M tokens) of $HOODMEMES on Robinhood Chain for at least 72 hours before snapshot.",
              },
              {
                n: "02",
                t: "Follow on X",
                d: "Follow @hoodmemesdotfun. Turn on notifications if you want — we love the notif gang.",
              },
              {
                n: "03",
                t: "Post once",
                d: "One original tweet with $HOODMEMES + official CA or hoodmemes.fun. Make it yours.",
              },
            ].map((c) => (
              <div
                key={c.n}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#ccff00]/35"
              >
                <div className="text-[11px] font-black tracking-widest text-[#ccff00]">
                  {c.n}
                </div>
                <div className="mt-2 text-lg font-black text-white">{c.t}</div>
                <p className="mt-2 text-xs leading-relaxed text-white/45">
                  {c.d}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Tiers */}
        <section>
          <h2 className="text-xl font-black text-white sm:text-2xl">
            Size tiers — bigger bag, bigger drop
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Stack weight. Everyone who qualifies eats — heavier bags eat more.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-[#ccff00]/10 text-[11px] font-black uppercase tracking-wider text-[#ccff00]">
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Hold (greater of)</th>
                  <th className="px-4 py-3 text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {[
                  {
                    tier: "Entry",
                    hold: "$10 or 1M tokens",
                    w: "1×",
                    hi: false,
                  },
                  {
                    tier: "Serious",
                    hold: "$50 or 5M tokens",
                    w: "3×",
                    hi: true,
                  },
                  {
                    tier: "Believer",
                    hold: "$100 or 10M tokens",
                    w: "6×",
                    hi: true,
                  },
                ].map((r) => (
                  <tr
                    key={r.tier}
                    className={`border-b border-white/5 ${
                      r.hi ? "bg-[#ccff00]/[0.04]" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 font-black text-white">
                      {r.tier}
                    </td>
                    <td className="px-4 py-3.5 text-white/60">{r.hold}</td>
                    <td className="px-4 py-3.5 text-right font-black text-[#ccff00]">
                      {r.w}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Multipliers */}
        <section>
          <h2 className="text-xl font-black text-white sm:text-2xl">
            Bonus multipliers
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Stack these on top of your tier. More ways in = more ways up.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                t: "Verified X on HoodMemes",
                d: "Link your X from Account — badge on launches, +1× on the drop.",
                m: "+1×",
              },
              {
                t: "Launched a coin here",
                d: "You shipped on the pad. Builders get fed. +2×.",
                m: "+2×",
              },
              {
                t: "Quote our official launch post",
                d: "Quote-tweet the official $HOODMEMES launch from @hoodmemesdotfun. +1×.",
                m: "+1×",
              },
              {
                t: "Still holding at claim",
                d: "Qualify at snapshot and still hold the floor at claim. Loyalty snack. +1×.",
                m: "+1×",
              },
            ].map((b) => (
              <div
                key={b.t}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="shrink-0 rounded-xl bg-[#ccff00] px-3 py-2 text-sm font-black text-black">
                  {b.m}
                </div>
                <div>
                  <div className="font-black text-white">{b.t}</div>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    {b.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 sm:p-8">
          <h2 className="text-xl font-black text-white">How the drop works</h2>
          <ol className="mt-5 space-y-4">
            {[
              {
                t: "Qualify",
                d: "Buy/hold the floor, follow, post. Climb tiers if you want more weight.",
              },
              {
                t: "Snapshots",
                d: "We may run one or two snapshots. Dates only from @hoodmemesdotfun — never from DMs.",
              },
              {
                t: "Claim",
                d: "Connect wallet on hoodmemes.fun when claim opens. Holding the floor at claim is a good look (and a bonus).",
              },
              {
                t: "CA source of truth",
                d: "Official contract only from @hoodmemesdotfun or this site. If it isn’t us, it’s bait.",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ccff00] text-sm font-black text-black">
                  {i + 1}
                </div>
                <div>
                  <div className="font-black text-white">{s.t}</div>
                  <p className="mt-0.5 text-sm text-white/45">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA strip */}
        <section className="overflow-hidden rounded-3xl border border-[#ccff00]/40 bg-gradient-to-r from-[#ccff00]/20 via-[#ccff00]/5 to-transparent p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white">Get positioned</h2>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            Grab a bag, make some noise, invite the timeline. The trenches eat
            first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/token/${CA}?pair=${PAIR}`}
              className="rounded-2xl bg-[#ccff00] px-6 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(204,255,0,0.3)]"
            >
              Trade $HOODMEMES
            </Link>
            <Link
              href="/create"
              className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white"
            >
              Launch a coin
            </Link>
            <Link
              href="/account"
              className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white/70"
            >
              Verify X
            </Link>
            <a
              href="https://x.com/hoodmemesdotfun"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white/70"
            >
              𝕏 Official
            </a>
          </div>
        </section>

        <p className="text-center text-[11px] leading-relaxed text-white/30">
          Not financial advice. Memecoins can go to zero. Airdrop size, timing,
          and eligibility are set by the team and may change. DYOR.{" "}
          <Link href="/disclaimer" className="text-white/45 hover:text-[#ccff00]">
            Disclaimer
          </Link>
          {" · "}
          <a
            href="mailto:admin@hoodmemes.fun"
            className="text-white/45 hover:text-[#ccff00]"
          >
            admin@hoodmemes.fun
          </a>
        </p>
      </div>
    </div>
  );
}
