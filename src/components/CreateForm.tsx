"use client";

import { useMemo, useState } from "react";
import { parseEther, decodeEventLog, type Hex } from "viem";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { factoryAbi } from "@/lib/abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";
import {
  FEE_PRESETS,
  type FeeConfig,
  type FeePresetId,
  feeSplitOk,
  bpsToPct,
} from "@/lib/feePresets";
import { getPublicClient } from "@/lib/wallet-tx";
import { useAuth } from "./AuthProvider";
import Link from "next/link";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00c805]/45 focus:ring-1 focus:ring-[#00c805]/25";

const CREATE_FEE_FALLBACK = "0.0005";

export function CreateForm() {
  const { address, mode, ethBalance, writeContract, refreshBalance } = useAuth();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [desc, setDesc] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creatorBuy, setCreatorBuy] = useState("0.05");
  const [preset, setPreset] = useState<FeePresetId>("balanced");
  const [fees, setFees] = useState<FeeConfig>(FEE_PRESETS.balanced.fees);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [launched, setLaunched] = useState<{
    token: string;
    market: string;
  } | null>(null);

  const configured = isFactoryConfigured();

  const totalEth = useMemo(() => {
    const buy = Number(creatorBuy) || 0;
    const fee = Number(CREATE_FEE_FALLBACK);
    return (buy + fee).toFixed(4);
  }, [creatorBuy]);

  function applyPreset(id: FeePresetId) {
    setPreset(id);
    if (id !== "custom") setFees(FEE_PRESETS[id].fees);
  }

  function patchFee<K extends keyof FeeConfig>(key: K, value: number) {
    setPreset("custom");
    setFees((f) => ({ ...f, [key]: value }));
  }

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

    if (!feeSplitOk(fees)) {
      setErr(
        "Fee split must sum to 100% (creator + protocol + buyback-burn = 10000 bps)."
      );
      return;
    }
    if (!configured) {
      setErr(
        "Factory not deployed yet. Set NEXT_PUBLIC_FACTORY_ADDRESS after forge script deploy."
      );
      return;
    }

    setBusy(true);
    try {
      const publicClient = getPublicClient();
      const createFee = parseEther(CREATE_FEE_FALLBACK);
      const buyWei = parseEther(creatorBuy || "0");
      const value = createFee + buyWei;

      const hash = await writeContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: factoryAbi,
        functionName: "createToken",
        args: [
          name,
          symbol,
          {
            buyFeeBps: fees.buyFeeBps,
            sellFeeBps: fees.sellFeeBps,
            feeCreatorBps: fees.feeCreatorBps,
            feeProtocolBps: fees.feeProtocolBps,
            feeBuybackBurnBps: fees.feeBuybackBurnBps,
            tokenBurnOnBuyBps: fees.tokenBurnOnBuyBps,
          },
          0n,
        ],
        value,
      });

      setMsg(`Submitted ${hash.slice(0, 12)}… waiting for confirm`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as Hex,
      });

      let token = "";
      let market = "";
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: factoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "TokenCreated") {
            const args = ev.args as { token: string; market: string };
            token = args.token;
            market = args.market;
          }
        } catch {
          /* not our event */
        }
      }

      if (token && market) {
        setLaunched({ token, market });
        try {
          const key = "hoodmemes_launches";
          const prev = JSON.parse(localStorage.getItem(key) || "[]");
          prev.unshift({
            token,
            market,
            name,
            symbol,
            desc,
            image: imagePreview,
            createdAt: Date.now(),
            creator: address,
          });
          localStorage.setItem(key, JSON.stringify(prev.slice(0, 100)));
        } catch {
          /* ignore */
        }
        setMsg(`$${symbol} live on bonding curve.`);
        await refreshBalance();
      } else {
        setMsg("Confirmed — check explorer if token not decoded.");
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
          <strong className="text-[#00c805]">Creator buy is real.</strong> Set
          ETH below to snipe your own supply at launch (like Pump). Fees can go
          to you, the protocol, and/or buyback-burn — plus optional token burn on
          every buy.
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <Field label="Name">
            <input
              required
              maxLength={32}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cash Cat"
              className={inputCls}
            />
          </Field>
          <Field label="Ticker">
            <input
              required
              maxLength={12}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="CASHCAT"
              className={`${inputCls} uppercase`}
            />
          </Field>
          <Field label="Description">
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
          <h3 className="text-sm font-bold text-white">1 · Creator buy supply</h3>
          <p className="text-xs text-white/45">
            ETH spent on the bonding curve at create (you receive tokens). Set 0
            to skip. Plus anti-spam create fee (~{CREATE_FEE_FALLBACK} ETH).
          </p>
          <Field label="Initial buy (ETH)">
            <input
              type="number"
              min="0"
              step="any"
              value={creatorBuy}
              onChange={(e) => setCreatorBuy(e.target.value)}
              className={inputCls}
            />
          </Field>
          <p className="text-xs text-white/50">
            Total from quick wallet ≈{" "}
            <strong className="text-white">{totalEth} ETH</strong>
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white">
            2 · Fees & burns (industry settings)
          </h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FEE_PRESETS) as Array<keyof typeof FEE_PRESETS>).map(
              (id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyPreset(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    preset === id
                      ? "bg-[#00c805] text-black"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {FEE_PRESETS[id].label}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setPreset("custom")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                preset === "custom"
                  ? "bg-[#00c805] text-black"
                  : "bg-white/5 text-white/60"
              }`}
            >
              Custom
            </button>
          </div>
          {preset !== "custom" && (
            <p className="text-[11px] text-white/40">
              {FEE_PRESETS[preset].blurb}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <BpsField
              label="Buy fee"
              value={fees.buyFeeBps}
              onChange={(v) => patchFee("buyFeeBps", v)}
              max={1000}
            />
            <BpsField
              label="Sell fee"
              value={fees.sellFeeBps}
              onChange={(v) => patchFee("sellFeeBps", v)}
              max={1000}
            />
            <BpsField
              label="Fee → creator"
              value={fees.feeCreatorBps}
              onChange={(v) => patchFee("feeCreatorBps", v)}
              max={10000}
            />
            <BpsField
              label="Fee → protocol"
              value={fees.feeProtocolBps}
              onChange={(v) => patchFee("feeProtocolBps", v)}
              max={10000}
            />
            <BpsField
              label="Fee → buyback & burn"
              value={fees.feeBuybackBurnBps}
              onChange={(v) => patchFee("feeBuybackBurnBps", v)}
              max={10000}
            />
            <BpsField
              label="Token burn on buy"
              value={fees.tokenBurnOnBuyBps}
              onChange={(v) => patchFee("tokenBurnOnBuyBps", v)}
              max={2000}
            />
          </div>

          <div
            className={`rounded-xl px-3 py-2 text-xs ${
              feeSplitOk(fees)
                ? "bg-[#00c805]/10 text-[#00c805]"
                : "bg-rose-500/10 text-rose-300"
            }`}
          >
            Fee split: creator {bpsToPct(fees.feeCreatorBps)} + protocol{" "}
            {bpsToPct(fees.feeProtocolBps)} + buyback-burn{" "}
            {bpsToPct(fees.feeBuybackBurnBps)} ={" "}
            {bpsToPct(
              fees.feeCreatorBps + fees.feeProtocolBps + fees.feeBuybackBurnBps
            )}{" "}
            {feeSplitOk(fees) ? "✓" : "(must be 100%)"}
          </div>
        </div>

        <div className="rounded-xl bg-black/30 px-3 py-2 font-mono text-[11px] text-white/40">
          {ROBINHOOD_CHAIN.name} · chainId {ROBINHOOD_CHAIN.id} · factory{" "}
          {configured ? `${FACTORY_ADDRESS.slice(0, 10)}…` : "not set"}
        </div>

        <button
          type="submit"
          disabled={busy || !name || !symbol || !feeSplitOk(fees)}
          className="w-full rounded-xl bg-[#00c805] py-3 text-sm font-bold text-black transition hover:bg-[#00e006] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Launching…" : `Launch $${symbol || "TOKEN"}`}
        </button>

        {msg && <p className="text-sm text-white/70">{msg}</p>}
        {err && <p className="text-sm text-rose-300">{err}</p>}
        {launched && (
          <div className="rounded-xl border border-[#00c805]/30 bg-[#00c805]/10 p-4 text-sm">
            <p className="font-semibold text-[#00c805]">Launched</p>
            <Link
              href={`/token/${launched.token}?market=${launched.market}`}
              className="mt-2 inline-block text-white underline"
            >
              Trade ${symbol} now →
            </Link>
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
          <p className="font-semibold text-white/60">How fees work</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <strong className="text-white/55">Trade fee</strong> — % of ETH on
              buy/sell
            </li>
            <li>
              <strong className="text-white/55">Creator</strong> — ETH to your
              wallet
            </li>
            <li>
              <strong className="text-white/55">Buyback & burn</strong> — fee ETH
              buys tokens off the curve and destroys them
            </li>
            <li>
              <strong className="text-white/55">Token burn on buy</strong> — % of
              purchased tokens never minted (deflation)
            </li>
            <li>
              <strong className="text-white/55">Manual burn</strong> — any holder
              can burn their bag on the trade page
            </li>
          </ul>
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

function BpsField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-white/40">
        {label} <span className="text-white/60">({bpsToPct(value)})</span>
      </span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={inputCls}
      />
    </label>
  );
}
