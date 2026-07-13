"use client";

import { useMemo, useState } from "react";
import { parseEther, decodeEventLog, type Hex } from "viem";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { factoryAbi } from "@/lib/abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";
import { getPublicClient } from "@/lib/wallet-tx";
import { useAuth } from "./AuthProvider";
import Link from "next/link";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00c805]/45 focus:ring-1 focus:ring-[#00c805]/25";

const CREATE_FEE = "0.0005";
const MIN_LP = "0.01";

export const SUPPLY_PRESETS = [
  { label: "1 Billion", value: 1_000_000_000n * 10n ** 18n },
  { label: "5 Billion", value: 5_000_000_000n * 10n ** 18n },
  { label: "10 Billion", value: 10_000_000_000n * 10n ** 18n },
  { label: "100 Billion", value: 100_000_000_000n * 10n ** 18n },
  { label: "1 Trillion", value: 1_000_000_000_000n * 10n ** 18n },
] as const;

const LP_PRESETS = ["0.05", "0.1", "0.2", "0.5"] as const;

export function CreateForm() {
  const { address, mode, ethBalance, writeContract, refreshBalance } = useAuth();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [desc, setDesc] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<bigint>(SUPPLY_PRESETS[0].value);
  const [lpEth, setLpEth] = useState("0.05");
  const [burnLp, setBurnLp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [launched, setLaunched] = useState<{
    token: string;
    pair: string;
  } | null>(null);

  const configured = isFactoryConfigured();

  const totalEth = useMemo(() => {
    const lp = Number(lpEth) || 0;
    const fee = Number(CREATE_FEE);
    return (lp + fee).toFixed(4);
  }, [lpEth]);

  function onImage(file: File | null) {
    if (!file) {
      setImagePreview(null);
      return;
    }
    setImagePreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLaunched(null);

    if (!configured) {
      setErr(
        "Instant factory not deployed yet. Deploy HoodInstantFactory and set NEXT_PUBLIC_FACTORY_ADDRESS."
      );
      return;
    }

    const lp = Number(lpEth);
    if (!Number.isFinite(lp) || lp < Number(MIN_LP)) {
      setErr(`LP ETH must be at least ${MIN_LP} ETH`);
      return;
    }

    setBusy(true);
    try {
      const publicClient = getPublicClient();
      const createFee = parseEther(CREATE_FEE);
      const lpWei = parseEther(lpEth || "0");
      const value = createFee + lpWei;

      const hash = await writeContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: factoryAbi,
        functionName: "createToken",
        args: [name, symbol, totalSupply, burnLp],
        value,
      });

      setMsg(`Submitted ${hash.slice(0, 12)}… waiting for confirm`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as Hex,
      });

      let token = "";
      let pair = "";
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: factoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "TokenLaunched") {
            const args = ev.args as { token: string; pair: string };
            token = args.token;
            pair = args.pair;
          }
        } catch {
          /* not our event */
        }
      }

      if (token) {
        setLaunched({ token, pair });
        try {
          const key = "hoodmemes_launches";
          const prev = JSON.parse(localStorage.getItem(key) || "[]");
          prev.unshift({
            token,
            pair,
            name,
            symbol,
            desc,
            image: imagePreview,
            createdAt: Date.now(),
            creator: address,
            burnLp,
            lpEth,
            totalSupply: totalSupply.toString(),
            instant: true,
          });
          localStorage.setItem(key, JSON.stringify(prev.slice(0, 100)));
        } catch {
          /* ignore */
        }
        setMsg(
          `$${symbol} live on Uniswap${burnLp ? " (LP burned)" : " (you hold LP)"}. DexScreener can index the pair shortly.`
        );
        await refreshBalance();
      } else {
        setMsg("Confirmed — check explorer if event not decoded.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="rounded-2xl border border-[#00c805]/25 bg-[#00c805]/5 px-4 py-3 text-sm text-[#b8f5b8]">
          <strong className="text-[#00c805]">Instant Uniswap launch.</strong>{" "}
          Fixed supply + LP in one transaction. Live on Uni immediately —
          DexScreener can pick it up without a bonding-curve wait.
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <Field label="Name">
            <input
              required
              maxLength={32}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="HoodMemes"
              className={inputCls}
            />
          </Field>
          <Field label="Ticker">
            <input
              required
              maxLength={12}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="HOODMEMES"
              className={`${inputCls} uppercase`}
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              maxLength={280}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Image
            </span>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer rounded-xl border border-dashed border-white/20 px-6 py-4 text-xs text-white/50 hover:border-[#00c805]/40">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImage(e.target.files?.[0] ?? null)}
                />
              </label>
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover"
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white">1 · Total supply (fixed)</h3>
          <p className="text-xs text-white/45">
            Entire supply goes into the Uniswap pool. No unlimited minting.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUPPLY_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setTotalSupply(p.value)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  totalSupply === p.value
                    ? "bg-[#00c805] text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white">2 · Initial LP (ETH)</h3>
          <p className="text-xs text-white/45">
            Your ETH seeds the TOKEN/WETH Uniswap pool. Min {MIN_LP} ETH. Plus
            launch fee ~{CREATE_FEE} ETH to protocol.
          </p>
          <div className="flex flex-wrap gap-2">
            {LP_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setLpEth(v)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  lpEth === v
                    ? "bg-[#00c805] text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {v} ETH
              </button>
            ))}
          </div>
          <Field label="Custom LP ETH">
            <input
              type="number"
              min={MIN_LP}
              step="any"
              value={lpEth}
              onChange={(e) => setLpEth(e.target.value)}
              className={inputCls}
            />
          </Field>
          <p className="text-xs text-white/50">
            Total from wallet ≈{" "}
            <strong className="text-white">{totalEth} ETH</strong>
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white">3 · LP ownership</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBurnLp(true)}
              className={`rounded-xl border p-3 text-left text-xs transition ${
                burnLp
                  ? "border-[#00c805]/50 bg-[#00c805]/10 text-white"
                  : "border-white/10 bg-black/20 text-white/50"
              }`}
            >
              <div className="font-bold text-sm">Burn LP (recommended)</div>
              <div className="mt-1 text-white/45">
                Liquidity locked forever. Stronger trust / anti-rug signal.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setBurnLp(false)}
              className={`rounded-xl border p-3 text-left text-xs transition ${
                !burnLp
                  ? "border-amber-500/50 bg-amber-500/10 text-white"
                  : "border-white/10 bg-black/20 text-white/50"
              }`}
            >
              <div className="font-bold text-sm">Keep LP</div>
              <div className="mt-1 text-white/45">
                LP tokens go to you. You can earn fees or remove liquidity later.
              </div>
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-black/30 px-3 py-2 font-mono text-[11px] text-white/40">
          {ROBINHOOD_CHAIN.name} · chainId {ROBINHOOD_CHAIN.id} · factory{" "}
          {configured ? `${FACTORY_ADDRESS.slice(0, 10)}…` : "not set"}
        </div>

        <button
          type="submit"
          disabled={busy || !name || !symbol}
          className="w-full rounded-xl bg-[#00c805] py-3 text-sm font-bold text-black transition hover:bg-[#00e006] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Launching on Uniswap…"
            : `Launch $${symbol || "TOKEN"} on Uniswap`}
        </button>

        {msg && <p className="text-sm text-white/70">{msg}</p>}
        {err && <p className="text-sm text-rose-300">{err}</p>}
        {launched && (
          <div className="rounded-xl border border-[#00c805]/30 bg-[#00c805]/10 p-4 text-sm space-y-2">
            <p className="font-semibold text-[#00c805]">Live on Uniswap</p>
            <p className="font-mono text-[11px] text-white/50 break-all">
              Token {launched.token}
            </p>
            {launched.pair && (
              <p className="font-mono text-[11px] text-white/50 break-all">
                Pair {launched.pair}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={`/token/${launched.token}${launched.pair ? `?pair=${launched.pair}` : ""}`}
                className="text-white underline"
              >
                Open token page →
              </Link>
              {launched.pair && (
                <a
                  href={`https://dexscreener.com/robinhood/${launched.pair}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00c805] underline"
                >
                  DexScreener ↗
                </a>
              )}
              <a
                href={`https://app.uniswap.org/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${launched.token}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#00c805] underline"
              >
                Trade on Uniswap ↗
              </a>
            </div>
          </div>
        )}
      </form>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-[#00c805]/20 bg-[#00c805]/[0.06] p-4 text-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#00c805]">
            Paying from
          </div>
          <div className="mt-1 font-mono text-xs text-white/80 break-all">
            {address}
          </div>
          <div className="mt-1 text-xs text-white/50">
            {ethBalance} ETH · {mode === "session" ? "quick wallet" : "browser wallet"}
          </div>
          <Link
            href="/account"
            className="mt-2 inline-block text-xs text-[#00c805] hover:underline"
          >
            Manage wallet →
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[11px] leading-relaxed text-white/40">
          <p className="font-semibold text-white/60">How it works</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4">
            <li>You pick fixed supply + LP ETH</li>
            <li>One tx mints supply and seeds Uniswap V2</li>
            <li>Optional: burn LP so liquidity can&apos;t be pulled</li>
            <li>Token is tradeable on Uni immediately</li>
            <li>DexScreener indexes the pair (often minutes)</li>
          </ol>
          <p className="mt-3 text-white/35">
            Launch fee (~{CREATE_FEE} ETH) → protocol. LP ETH → pool. You profit
            from tokens you buy on Uni after, or from LP fees if you keep LP.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}
