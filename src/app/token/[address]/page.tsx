import Link from "next/link";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { formatPct, formatUsd, shortAddr, timeAgo } from "@/lib/format";
import { ROBINHOOD_CHAIN, UNISWAP_APP, WETH_ADDRESS } from "@/lib/chain";

export const revalidate = 15;

export default async function TokenPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const token = await fetchTokenByAddress(address);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-bold text-white">Token not found</h1>
        <p className="text-sm text-white/50">
          No DexScreener pair on Robinhood Chain for {shortAddr(address)}.
        </p>
        <Link href="/" className="text-[#00c805] hover:underline">
          ← Back to board
        </Link>
      </div>
    );
  }

  const up = (token.priceChange24h ?? 0) >= 0;
  const tradeUrl = `${UNISWAP_APP}/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${token.address}`;
  const explorer = `${ROBINHOOD_CHAIN.blockExplorers.default.url}/token/${token.address}`;
  const chartSrc = token.pairAddress
    ? `https://dexscreener.com/robinhood/${token.pairAddress}?embed=1&theme=dark&trades=0&info=0`
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex text-sm text-white/45 hover:text-[#00c805]"
      >
        ← Board
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {token.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.imageUrl}
              alt={token.symbol}
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00c805]/20 text-2xl font-black text-[#00c805]">
              {token.symbol[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-white">
              ${token.symbol}{" "}
              <span className="text-base font-normal text-white/40">
                {token.name}
              </span>
            </h1>
            <p className="font-mono text-xs text-white/35">
              {token.address}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Created {timeAgo(token.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={tradeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#00c805] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#00e006]"
          >
            Trade on Uniswap
          </a>
          {token.dexscreenerUrl && (
            <a
              href={token.dexscreenerUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"
            >
              DexScreener
            </a>
          )}
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"
          >
            Explorer
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Price" value={formatUsd(token.priceUsd, false)} />
        <Metric label="Market cap" value={formatUsd(token.marketCap)} />
        <Metric label="Volume 24h" value={formatUsd(token.volume24h)} />
        <Metric
          label="24h"
          value={formatPct(token.priceChange24h)}
          accent={up ? "up" : "down"}
        />
      </div>

      {chartSrc && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <iframe
            title={`${token.symbol} chart`}
            src={chartSrc}
            className="h-[420px] w-full"
          />
        </div>
      )}

      <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/40">
        Quote typically WETH ({shortAddr(WETH_ADDRESS)}) · Liquidity{" "}
        {formatUsd(token.liquidity)} · Txns 24h {token.txns24h ?? "—"}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "up" | "down";
}) {
  const color =
    accent === "up"
      ? "text-[#00c805]"
      : accent === "down"
        ? "text-rose-400"
        : "text-white";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/35">
        {label}
      </div>
      <div className={`mt-0.5 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
