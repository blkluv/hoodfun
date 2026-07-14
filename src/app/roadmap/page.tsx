import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "HoodMemes product roadmap — platform fees buyback & burn, V3 launches, creator tools, and the Robinhood Chain trenches.",
  openGraph: {
    title: "HoodMemes Roadmap",
    description:
      "Where we're going: fee buybacks, locked V3 launches, creator tools, and more on Robinhood Chain.",
  },
};

type Item = {
  title: string;
  body: string;
  tag?: string;
};

type Phase = {
  id: string;
  label: string;
  status: "live" | "building" | "planned";
  blurb: string;
  items: Item[];
};

const PHASES: Phase[] = [
  {
    id: "now",
    label: "Now",
    status: "live",
    blurb: "Live on Robinhood Chain — ship, harden, listen to the trenches.",
    items: [
      {
        title: "Instant Uniswap V3 launches",
        body: "One-tx create → V3 pool, locked LP, first buy in the same transaction. Built for indexers and real price discovery.",
        tag: "Live",
      },
      {
        title: "Launchpad board + token pages",
        body: "Trending discovery, launch meta, verified X for launchers, and clean trade pages with charts.",
        tag: "Live",
      },
      {
        title: "Token list + logos",
        body: "Public tokenlist.json and logo storage so wallets and tools can pull HoodMemes launches.",
        tag: "Live",
      },
    ],
  },
  {
    id: "next",
    label: "Next",
    status: "building",
    blurb: "Turn platform revenue into demand for the official coin — and make launching feel effortless.",
    items: [
      {
        title: "Platform fee buyback & burn",
        body: "A share of create / protocol fees is used to buy the official $HOODMEMES on the open market and burn it. Transparent, on-chain when possible — not vapor promises.",
        tag: "Core",
      },
      {
        title: "Public fee dashboard",
        body: "Live view of fees collected, buybacks executed, and burn totals so the community can verify the loop.",
        tag: "Transparency",
      },
      {
        title: "Creator fee claims",
        body: "One-click collect for locked V3 LP fee share — creators earn without holding the LP NFT. Live on Account + token pages.",
        tag: "Live",
      },
      {
        title: "Smarter discovery",
        body: "Recency + buy-pressure ranking, Moving now strip, Hood tab, Fomo/Dex deep-links on cards.",
        tag: "Live",
      },
      {
        title: "Ansem-style airdrop",
        body: "High-signal CT distribution: dust/bags to curated wallets (early trenchers, RH memecoin holders, KOL-adjacent lists) — loud, cultural, not a farm for bots. Aim is mindshare and real wallet activity, not empty sybil spam. Exact lists + size drop when ready; CA only from @hoodmemesdotfun.",
        tag: "Culture",
      },
    ],
  },
  {
    id: "later",
    label: "Later",
    status: "planned",
    blurb: "Scale the trenches without losing the degen edge.",
    items: [
      {
        title: "Campaign & boost rails",
        body: "Optional paid boosts and featured slots that still feed the buyback engine — attention with a sink.",
        tag: "Growth",
      },
      {
        title: "Launcher reputation",
        body: "On-chain + social score for serial launchers: verified X, prior LP locks, and community flags.",
        tag: "Trust",
      },
      {
        title: "Advanced terminal",
        body: "Faster multi-chart desk, sniper-aware defaults, and mobile-first trade UX for RH memecoins.",
        tag: "Product",
      },
      {
        title: "Ecosystem integrations",
        body: "Deeper wallet tokenlists, explorer badges, and partner AMMs as Robinhood Chain liquidity matures.",
        tag: "Infra",
      },
      {
        title: "Community treasury tools",
        body: "Optional squad wallets and transparent spend notes for culture campaigns funded by fee share.",
        tag: "Culture",
      },
    ],
  },
];

function StatusPill({ status }: { status: Phase["status"] }) {
  if (status === "live") {
    return (
      <span className="rounded-full bg-[#ccff00]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ccff00]">
        Live
      </span>
    );
  }
  if (status === "building") {
    return (
      <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
        Building
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
      Planned
    </span>
  );
}

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-8 pb-16">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ccff00]">
          Product
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Roadmap
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          HoodMemes is the trenches launchpad on Robinhood Chain. This is where
          we&apos;re taking it — fees that buy and burn the official coin,
          better launches, and tools traders actually use.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/create"
            className="rounded-xl bg-[#ccff00] px-4 py-2 text-sm font-black text-black"
          >
            Launch a coin
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5"
          >
            How it works
          </Link>
          <a
            href="https://x.com/hoodmemesdotfun"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5"
          >
            Follow on 𝕏
          </a>
        </div>
      </div>

      {/* Highlight: buyback */}
      <section className="rounded-2xl border border-[#ccff00]/35 bg-gradient-to-br from-[#ccff00]/12 to-transparent p-5 sm:p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#ccff00]">
          North star
        </div>
        <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
          Platform fees → buyback & burn
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Protocol revenue from launches isn&apos;t just treasury flex. A defined
          share is allocated to market buy the official{" "}
          <strong className="text-white/85">$HOODMEMES</strong> and burn supply —
          aligning the pad with holders, not extractive dumps.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-white/50">
          <li className="flex gap-2">
            <span className="text-[#ccff00]">▸</span>
            Create fees and protocol cuts feed the engine
          </li>
          <li className="flex gap-2">
            <span className="text-[#ccff00]">▸</span>
            Buys execute on open market liquidity
          </li>
          <li className="flex gap-2">
            <span className="text-[#ccff00]">▸</span>
            Burns reduce circulating supply over time
          </li>
          <li className="flex gap-2">
            <span className="text-[#ccff00]">▸</span>
            Public dashboard so anyone can audit the flow
          </li>
        </ul>
        <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/50">
          <strong className="text-white/80">Also cooking:</strong> an{" "}
          <strong className="text-white/85">Ansem-style airdrop</strong> — CT
          culture distribution to high-signal wallets so the official coin shows
          up where the timeline already lives. Details when we ship it; not
          financial advice, not a partnership claim.
        </p>
      </section>

      {PHASES.map((phase) => (
        <section key={phase.id} id={phase.id} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{phase.label}</h2>
                <StatusPill status={phase.status} />
              </div>
              <p className="mt-1 text-sm text-white/40">{phase.blurb}</p>
            </div>
          </div>
          <ol className="space-y-3">
            {phase.items.map((item, i) => (
              <li
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-[#ccff00]/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-black text-white">
                    {item.title}
                  </h3>
                  {item.tag && (
                    <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold text-white/45">
                      {item.tag}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-white/45">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-relaxed text-white/45">
        <h2 className="text-base font-black text-white">Notes</h2>
        <p className="mt-2">
          Roadmaps move. Dates aren&apos;t promises — shipping is. Priorities
          shift with chain growth, security, and what the trenches actually use.
          Nothing here is financial advice. Official token CA will always be
          posted from{" "}
          <a
            href="https://x.com/hoodmemesdotfun"
            className="font-semibold text-[#ccff00] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            @hoodmemesdotfun
          </a>
          .
        </p>
        <p className="mt-3">
          See also{" "}
          <Link href="/disclaimer" className="text-[#ccff00] hover:underline">
            Disclaimer
          </Link>{" "}
          ·{" "}
          <Link href="/how-it-works" className="text-[#ccff00] hover:underline">
            How it works
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
