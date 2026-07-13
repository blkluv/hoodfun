import type { Metadata } from "next";
import Link from "next/link";
import { buildHoodTokenList } from "@/lib/tokenlist";
import { DEX_TOKEN_INFO_URL } from "@/lib/dex-links";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Token list",
  description:
    "Official HoodMemes Uniswap-style token list for Robinhood Chain launches — logos and CAs from hoodmemes.fun.",
  openGraph: {
    title: "HoodMemes Token List",
    description: "Import our token list for logos on Robinhood Chain memes.",
    url: "https://www.hoodmemes.fun/tokenlist",
  },
};

const LIST_URL = "https://www.hoodmemes.fun/tokenlist.json";

export default async function TokenListPage() {
  const list = await buildHoodTokenList().catch(() => null);
  const tokens = list?.tokens ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#00c805]">
          Legit stack
        </div>
        <h1 className="mt-1 text-3xl font-black text-white">
          HoodMemes token list
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          Public{" "}
          <a
            href="https://github.com/Uniswap/token-lists"
            className="text-[#00c805] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Uniswap Token Lists
          </a>{" "}
          feed of coins launched (or registered) on HoodMemes — with logos we
          host. Import the URL in wallets/apps that support custom lists.
        </p>
      </div>

      <section className="rounded-2xl border border-[#00c805]/25 bg-[#00c805]/5 p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#00c805]">
          List URL
        </div>
        <code className="mt-2 block break-all rounded-xl bg-black/40 px-3 py-2.5 font-mono text-xs text-white/85">
          {LIST_URL}
        </code>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={LIST_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#00c805] px-4 py-2 text-sm font-black text-black"
          >
            Open JSON
          </a>
          <Link
            href="/create"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80"
          >
            Launch a coin
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-white/40">
          Version {list ? `1.0.${list.version.patch}` : "—"} ·{" "}
          {tokens.length} token{tokens.length === 1 ? "" : "s"} · updated{" "}
          {list?.timestamp
            ? new Date(list.timestamp).toLocaleString()
            : "—"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-white">How logos show up</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              t: "1 · HoodMemes",
              d: "Logo saved on launch. Always on token page + board.",
            },
            {
              t: "2 · Token list",
              d: "Wallets/apps that import our list get logoURI + CA.",
            },
            {
              t: "3 · DexScreener (paid)",
              d: "Optional Enhanced Token Info for logo/socials on Dex itself.",
            },
          ].map((x) => (
            <div
              key={x.t}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-sm font-bold text-white">{x.t}</div>
              <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                {x.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <h2 className="text-lg font-black text-white">
          Optional: DexScreener Enhanced Token Info
        </h2>
        <p className="text-sm text-white/50">
          DexScreener does not offer a free API to set icons. For big launches,
          pay their marketplace product, pick{" "}
          <strong className="text-white/75">Robinhood</strong>, paste your CA,
          upload logo + socials.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-white/50">
          <li>Open Enhanced Token Info and sign in</li>
          <li>Chain: Robinhood · paste contract address</li>
          <li>Upload logo (same as HoodMemes), site, X, TG</li>
          <li>Pay · wait for DS to update the pair page</li>
        </ol>
        <a
          href={DEX_TOKEN_INFO_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-100"
        >
          DexScreener Token Info ↗
        </a>
      </section>

      <section>
        <h2 className="text-lg font-black text-white">
          Tokens on the list ({tokens.length})
        </h2>
        {tokens.length === 0 ? (
          <p className="mt-2 text-sm text-white/40">
            No launches in metadata yet. Launch a coin with a logo to populate
            the list.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10">
            {tokens.slice(0, 50).map((t) => (
              <li
                key={t.address}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                {t.logoURI ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.logoURI}
                    alt=""
                    className="h-9 w-9 rounded-xl object-cover bg-black/40"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00c805]/15 text-xs font-black text-[#00c805]">
                    {t.symbol[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white">${t.symbol}</div>
                  <div className="truncate font-mono text-[10px] text-white/35">
                    {t.address}
                  </div>
                </div>
                <Link
                  href={`/token/${t.address}`}
                  className="text-xs font-semibold text-[#00c805]"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-white/30">
        Not affiliated with Uniswap Labs or DexScreener. List is provided as-is
        for discovery; always verify CAs.
      </p>
    </div>
  );
}
