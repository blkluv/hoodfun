import type { Metadata } from "next";
import Link from "next/link";
import { AirdropClient } from "./AirdropClient";

export const metadata: Metadata = {
  title: "Airdrop",
  description:
    "$HOODMEMES community airdrop — hold, shill, thesis, giveaways, IRL. Official rules only on hoodmemes.com. CA from @hoodmemesdotcom.",
  openGraph: {
    title: "HoodMemes Airdrop — $HOODMEMES",
    description:
      "Skin in the game. Loud CT. Thesis on Fomo. Giveaways. IRL. Bigger signal = bigger drop.",
  },
};

const CA = "0xF90147A9594998Ca60FEB247F68Fca5fDE6e515a";
const PAIR = "0x8ccba7d44f3EFD84D733FEd457237c168c3fFC7c";
const FOMO = `https://fomo.family/tokens/robinhood/${CA.toLowerCase()}`;

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
            Community airdrop · open season
          </div>
          <h1 className="text-4xl font-black tracking-tight text-black sm:text-6xl md:text-7xl">
            $HOODMEMES
            <br />
            <span className="text-black/70">Airdrop</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed text-black/65 sm:text-lg">
            Not a checklist for robots. A vibe check for the trenches.
            <br className="hidden sm:block" />
            Hold. Shill. Write. Host. Touch grass. Stack signal.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/token/${CA}?pair=${PAIR}`}
              className="rounded-2xl bg-black px-7 py-3.5 text-sm font-black text-[#ccff00] shadow-lg transition hover:scale-[1.02]"
            >
              Get a bag →
            </Link>
            <a
              href="https://x.com/hoodmemesdotfun"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border-2 border-black/20 bg-white/40 px-6 py-3.5 text-sm font-black text-black hover:bg-white/60"
            >
              Follow @hoodmemesdotcom
            </a>
            <a
              href={FOMO}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border-2 border-black/20 bg-white/40 px-6 py-3.5 text-sm font-black text-black hover:bg-white/60"
            >
              Fomo page ↗
            </a>
          </div>
          <AirdropClient ca={CA} />
          <p className="mx-auto mt-4 max-w-lg text-[12px] font-semibold text-black/50">
            Exact snapshot thresholds stay flexible on purpose — real skin in
            the game beats dust. Details drop closer to snapshot, only from
            official channels.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6">
        {/* Philosophy */}
        <section className="rounded-3xl border border-[#ccff00]/30 bg-gradient-to-br from-[#ccff00]/12 via-transparent to-transparent p-6 sm:p-8">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ccff00]">
            The deal
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Bigger signal. Bigger slice.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            We&apos;re not publishing a rigid dollar or token floor for farmers
            to game line-by-line. If you&apos;re in the bag with a real position,
            loud on CT, and adding energy to the coin — you&apos;re the kind of
            wallet we want to feed. Dust, one-minute flips, and silent lurkers
            will naturally sit lighter.{" "}
            <strong className="text-white/80">
              Think conviction, not a spreadsheet.
            </strong>
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              { t: "Hold", d: "A real bag — not theater" },
              { t: "Amplify", d: "CT that actually moves culture" },
              { t: "Create", d: "Thesis, giveaways, IRL moments" },
            ].map((x) => (
              <div
                key={x.t}
                className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3"
              >
                <div className="font-black text-[#ccff00]">{x.t}</div>
                <div className="mt-0.5 text-xs text-white/45">{x.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Core pillars */}
        <section>
          <h2 className="text-xl font-black text-white sm:text-2xl">
            Core pillars
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Stack as many as you want. Every path counts.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                n: "01",
                t: "Skin in the game",
                d: "Hold $HOODMEMES on Robinhood Chain through the window before snapshot. Meaningful bag > dust. Longer holds and bigger conviction stack harder. Exact floors stay soft until we lock the snap — stay ready.",
              },
              {
                n: "02",
                t: "Follow the source",
                d: "Follow @hoodmemesdotcom. Notifs on if you like being early. Official CA, snaps, and claim only come from here and hoodmemes.com.",
              },
              {
                n: "03",
                t: "Make noise on X",
                d: "Original posts with $HOODMEMES + CA or hoodmemes.com. Quote our launch. Threads. Memes. The timeline should know the ticker.",
              },
              {
                n: "04",
                t: "Fomo thesis",
                d: "Write a real thesis on our Fomo.Family token page — why the coin, why RH, why now. Thoughtful > one-word spam. Quality stands out.",
                href: FOMO,
                linkLabel: "Open Fomo page ↗",
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
                {"href" in c && c.href && (
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs font-bold text-[#ccff00] hover:underline"
                  >
                    {c.linkLabel}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Culture & chaos */}
        <section>
          <h2 className="text-xl font-black text-white sm:text-2xl">
            Culture multipliers
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Extra ways to print signal. Creative &gt; corporate.
          </p>
          <div className="mt-5 grid gap-3">
            {[
              {
                tag: "FOMO",
                t: "Thesis on Fomo.Family",
                d: "Drop a proper write-up on the $HOODMEMES Fomo page — bull case, RH trenches, launchpad loop, whatever makes you believe. Screenshots welcome when claim opens.",
                href: FOMO,
              },
              {
                tag: "GIVEAWAY",
                t: "Run a giveaway",
                d: "Host a $HOODMEMES or RH-themed giveaway on X / TG — community raffles, meme contests, “RT + follow” drops. Tag @hoodmemesdotcom so we can see the chaos.",
              },
              {
                tag: "IRL",
                t: "Touch grass · IRL energy",
                d: "IRL meetups, stickers, merch drops, whiteboarding the ticker in the wild, city photo ops — anything that takes $HOODMEMES offline and back on camera. Film it. Post it.",
              },
              {
                tag: "BUILD",
                t: "Ship on the pad",
                d: "Launch a coin on HoodMemes, verify X on-site, hang in token chat. Builders and verified launchers stack extra weight.",
              },
              {
                tag: "CT",
                t: "High-signal content",
                d: "Threads, edits, memes, spaces, recap videos, translated shills — if it moves culture and mentions the ticker, it counts.",
              },
              {
                tag: "HOLD",
                t: "Diamond through the window",
                d: "Still holding when claim opens hits different. Snapshots may come more than once — staying in the bag is a strategy.",
              },
            ].map((b) => (
              <div
                key={b.t}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-5 sm:flex-row sm:items-start"
              >
                <div className="shrink-0 rounded-xl bg-[#ccff00] px-3 py-1.5 text-[10px] font-black tracking-wider text-black">
                  {b.tag}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-white">{b.t}</div>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    {b.d}
                  </p>
                  {"href" in b && b.href && (
                    <a
                      href={b.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-bold text-[#ccff00] hover:underline"
                    >
                      Write your thesis on Fomo ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Weight vibe */}
        <section className="overflow-hidden rounded-3xl border border-white/10">
          <div className="border-b border-white/10 bg-[#ccff00]/10 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#ccff00]">
            How weight feels (not a rigid scorecard)
          </div>
          <div className="divide-y divide-white/5 bg-black/30">
            {[
              {
                t: "In the bag",
                d: "You’re holding. You’re eligible energy.",
                w: "Base",
              },
              {
                t: "Bag + voice",
                d: "Holding and posting / following / Fomo thesis.",
                w: "Solid",
              },
              {
                t: "Heavy bag + culture",
                d: "Real size, loud CT, maybe a giveaway or launch on the pad.",
                w: "Spicy",
              },
              {
                t: "Main character",
                d: "Conviction bag, thesis, host energy, IRL or viral moments.",
                w: "Max",
              },
            ].map((r) => (
              <div
                key={r.t}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <div className="font-black text-white">{r.t}</div>
                  <div className="text-xs text-white/40">{r.d}</div>
                </div>
                <div className="rounded-full border border-[#ccff00]/40 bg-[#ccff00]/10 px-3 py-1 text-xs font-black text-[#ccff00]">
                  {r.w}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 sm:p-8">
          <h2 className="text-xl font-black text-white">How the drop runs</h2>
          <ol className="mt-5 space-y-4">
            {[
              {
                t: "Show up",
                d: "Bag, follow, post, thesis, giveaways, IRL — stack whatever fits your style.",
              },
              {
                t: "Snapshots",
                d: "One or more snaps. Windows announced only on @hoodmemesdotcom and this site. Stay bagged.",
              },
              {
                t: "Claim",
                d: "Connect wallet when claim opens on hoodmemes.com. We’ll keep it simple.",
              },
              {
                t: "Trust only official",
                d: "CA, dates, and claim links never from random DMs. If it isn’t us, it’s bait.",
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

        {/* CTA */}
        <section className="overflow-hidden rounded-3xl border border-[#ccff00]/40 bg-gradient-to-r from-[#ccff00]/20 via-[#ccff00]/5 to-transparent p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white">Go make it obvious</h2>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            Buy. Write the thesis. Host the giveaway. Film the IRL. The
            trenches notice.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/token/${CA}?pair=${PAIR}`}
              className="rounded-2xl bg-[#ccff00] px-6 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(204,255,0,0.3)]"
            >
              Trade $HOODMEMES
            </Link>
            <a
              href={FOMO}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white"
            >
              Fomo thesis
            </a>
            <Link
              href="/create"
              className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white/70"
            >
              Launch a coin
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
          weighting, and eligibility are discretionary and can change. DYOR.{" "}
          <Link
            href="/disclaimer"
            className="text-white/45 hover:text-[#ccff00]"
          >
            Disclaimer
          </Link>
          {" · "}
          <a
            href="mailto:hahz@hoodmemes.com"
            className="text-white/45 hover:text-[#ccff00]"
          >
            hahz@hoodmemes.com
          </a>
        </p>
      </div>
    </div>
  );
}
