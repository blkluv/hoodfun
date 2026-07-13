"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseEther, decodeEventLog, type Hex } from "viem";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { factoryAbi } from "@/lib/abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";
import { getPublicClient } from "@/lib/wallet-tx";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { VerifyXPanel, VerifiedBadge, type XVerification } from "./VerifyXPanel";
import { compressImageFile } from "@/lib/image-compress";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#00c805]/50 focus:ring-1 focus:ring-[#00c805]/25";

const CREATE_FEE = "0.0005";
const MIN_LP = "0.01";

export const SUPPLY_PRESETS = [
  { label: "1B", full: "1 Billion", value: 1_000_000_000n * 10n ** 18n },
  { label: "5B", full: "5 Billion", value: 5_000_000_000n * 10n ** 18n },
  { label: "10B", full: "10 Billion", value: 10_000_000_000n * 10n ** 18n },
  { label: "100B", full: "100 Billion", value: 100_000_000_000n * 10n ** 18n },
  { label: "1T", full: "1 Trillion", value: 1_000_000_000_000n * 10n ** 18n },
] as const;

const LP_PRESETS = ["0.05", "0.1", "0.2", "0.5"] as const;

/** Creator allocation: % of total supply sent to your wallet; rest → Uniswap LP */
export const CREATOR_ALLOC_PRESETS = [
  {
    bps: 0,
    pct: "0%",
    title: "Fair launch",
    tagline: "You get zero tokens",
    body: "100% of supply goes into the Uniswap pool. Strongest trust signal — buy on Uni if you want a bag.",
    badge: "Recommended",
  },
  {
    bps: 100,
    pct: "1%",
    title: "Tiny bag",
    tagline: "1% → your wallet",
    body: "1% of supply lands in your wallet at launch. 99% seeds the Uniswap LP with your ETH.",
    badge: null,
  },
  {
    bps: 500,
    pct: "5%",
    title: "Standard",
    tagline: "5% → your wallet",
    body: "5% of supply to you. 95% into Uniswap LP. Shown on the token page as “Creator: 5%”.",
    badge: "Popular",
  },
  {
    bps: 1000,
    pct: "10%",
    title: "Max allotment",
    tagline: "10% → your wallet",
    body: "Maximum allowed. 10% to you, 90% to the pool. Higher allocation = more sell pressure risk for buyers.",
    badge: "Cap",
  },
] as const;

export function CreateForm() {
  const { address, mode, ethBalance, writeContract, refreshBalance } = useAuth();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [desc, setDesc] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  /** Compressed base64 (no data: prefix) ready to upload after launch */
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageContentType, setImageContentType] = useState("image/jpeg");
  const [imageBusy, setImageBusy] = useState(false);

  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [tweet, setTweet] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");
  const [github, setGithub] = useState("");
  const [farcaster, setFarcaster] = useState("");
  const [showMoreSocial, setShowMoreSocial] = useState(false);
  const [xVerified, setXVerified] = useState<XVerification | null>(null);

  const onXVerified = useCallback((v: XVerification) => {
    setXVerified(v.verified ? v : null);
    if (v.verified && v.handle) {
      setTwitter((prev) => prev.trim() || `@${v.handle}`);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setXVerified(null);
      return;
    }
    fetch(`/api/verify-x?address=${address}`)
      .then((r) => r.json())
      .then((d: XVerification) => {
        if (d.verified) {
          setXVerified(d);
          if (d.handle) setTwitter((prev) => prev.trim() || `@${d.handle}`);
        }
      })
      .catch(() => null);
  }, [address]);

  const [totalSupply, setTotalSupply] = useState<bigint>(SUPPLY_PRESETS[0].value);
  const [lpEth, setLpEth] = useState("0.05");
  const [burnLp, setBurnLp] = useState(true);
  /** 0 | 100 | 500 | 1000 — % of supply to creator wallet */
  const [creatorBps, setCreatorBps] = useState<number>(0);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [launched, setLaunched] = useState<{
    token: string;
    pair: string;
  } | null>(null);

  const configured = isFactoryConfigured();
  const supplyLabel =
    SUPPLY_PRESETS.find((p) => p.value === totalSupply)?.full ?? "Custom";
  const creatorPct = creatorBps / 100;
  const lpPct = 100 - creatorPct;

  const totalEth = useMemo(() => {
    const lp = Number(lpEth) || 0;
    return (lp + Number(CREATE_FEE)).toFixed(4);
  }, [lpEth]);

  const socialCount = [
    website,
    twitter,
    tweet,
    telegram,
    discord,
    github,
    farcaster,
  ].filter((s) => s.trim()).length;

  async function onImage(file: File | null) {
    if (!file) {
      setImagePreview(null);
      setImageBase64(null);
      return;
    }
    setImageBusy(true);
    setErr(null);
    try {
      const { dataUrl, base64, contentType } = await compressImageFile(file);
      setImagePreview(dataUrl);
      setImageBase64(base64);
      setImageContentType(contentType);
    } catch (e) {
      setImagePreview(null);
      setImageBase64(null);
      setErr(e instanceof Error ? e.message : "Image failed");
    } finally {
      setImageBusy(false);
    }
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!name.trim()) return "Enter a token name";
      if (!symbol.trim()) return "Enter a ticker";
    }
    if (s === 2) {
      const lp = Number(lpEth);
      if (!Number.isFinite(lp) || lp < Number(MIN_LP)) {
        return `LP ETH must be at least ${MIN_LP}`;
      }
    }
    return null;
  }

  function next() {
    const e = validateStep(step);
    if (e) {
      setErr(e);
      return;
    }
    setErr(null);
    setStep((x) => Math.min(3, x + 1));
  }

  function back() {
    setErr(null);
    setStep((x) => Math.max(0, x - 1));
  }

  async function onSubmit() {
    setErr(null);
    setMsg(null);
    setLaunched(null);

    const e0 = validateStep(0);
    const e2 = validateStep(2);
    if (e0 || e2) {
      setErr(e0 || e2);
      return;
    }
    if (!configured) {
      setErr("Factory not configured. Set NEXT_PUBLIC_FACTORY_ADDRESS.");
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
        args: [
          name.trim(),
          symbol.trim().toUpperCase(),
          totalSupply,
          burnLp,
          creatorBps,
        ],
        value,
      });

      setMsg(`Submitted ${hash.slice(0, 12)}… confirming`);
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
          /* skip */
        }
      }

      if (token) {
        setLaunched({ token, pair });

        // Upload logo first so meta can reference it
        let imageUrl: string | undefined;
        if (imageBase64) {
          try {
            setMsg("Saving logo…");
            const up = await fetch("/api/upload-logo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                imageBase64,
                contentType: imageContentType,
              }),
            });
            const uj = await up.json();
            if (up.ok && uj.url) imageUrl = uj.url as string;
          } catch {
            /* non-fatal — token still live */
          }
        }

        // persist social meta (Upstash / file)
        try {
          await fetch("/api/launch-meta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              pair,
              name: name.trim(),
              symbol: symbol.trim().toUpperCase(),
              description: desc,
              website,
              twitter,
              tweet,
              telegram,
              discord,
              github,
              farcaster,
              creator: address,
              lpBurned: burnLp,
              lpEth,
              totalSupply: totalSupply.toString(),
              creatorBps,
              imageUrl,
              createdAt: Date.now(),
            }),
          });
        } catch {
          /* non-fatal */
        }
        try {
          const key = "hoodmemes_launches";
          const prev = JSON.parse(localStorage.getItem(key) || "[]");
          prev.unshift({
            token,
            pair,
            name,
            symbol,
            desc,
            website,
            twitter,
            tweet,
            telegram,
            discord,
            imageUrl,
            createdAt: Date.now(),
            creator: address,
            burnLp,
            lpEth,
            creatorBps,
            instant: true,
          });
          localStorage.setItem(key, JSON.stringify(prev.slice(0, 100)));
        } catch {
          /* ignore */
        }
        setMsg(`$${symbol.toUpperCase()} is live on Uniswap.`);
        await refreshBalance();
        setStep(4);
      } else {
        setMsg("Confirmed — check explorer if event not decoded.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setBusy(false);
    }
  }

  if (launched && step === 4) {
    return (
      <SuccessPanel
        symbol={symbol.toUpperCase()}
        token={launched.token}
        pair={launched.pair}
        burnLp={burnLp}
        creatorBps={creatorBps}
        imagePreview={imagePreview}
        socials={{ website, twitter, tweet, telegram, discord }}
      />
    );
  }

  const steps = ["Identity", "Authority", "Liquidity", "Review"];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {/* Stepper */}
        <div className="hm-glass flex gap-1 rounded-2xl p-1.5">
          {steps.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (i < step) {
                  setErr(null);
                  setStep(i);
                }
              }}
              className={`flex-1 rounded-xl px-2 py-2.5 text-center text-[11px] font-bold transition sm:text-xs ${
                i === step
                  ? "bg-[#00c805] text-black shadow-[0_0_20px_rgba(0,200,5,0.3)]"
                  : i < step
                    ? "bg-white/10 text-white/80 hover:bg-white/15"
                    : "text-white/30"
              }`}
            >
              <span className="hidden sm:inline">{i + 1}. </span>
              {label}
            </button>
          ))}
        </div>

        {/* STEP 0 — Identity */}
        {step === 0 && (
          <Section
            title="Token identity"
            subtitle="How the trenches will know your coin"
          >
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex flex-col items-center gap-2">
                <label className="group relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-black/30 transition hover:border-[#00c805]/50">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-2 text-center text-[11px] text-white/35">
                      {imageBusy ? "…" : "Logo"}
                      <br />
                      {imageBusy ? "compress" : "upload"}
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={imageBusy}
                    onChange={(e) => onImage(e.target.files?.[0] ?? null)}
                  />
                </label>
                <span className="text-[10px] text-white/30">
                  {imageBase64 ? "Saved on launch" : "Optional · max 8MB"}
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
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
                    className={`${inputCls} uppercase tracking-wide`}
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    maxLength={280}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="What is this coin about?"
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
            </div>
          </Section>
        )}

        {/* STEP 1 — Authority / socials */}
        {step === 1 && (
          <Section
            title="Launcher authority"
            subtitle="Verify X + add socials. Degens check this before they ape."
          >
            <VerifyXPanel variant="compact" onVerified={onXVerified} />

            <div className="mt-5 mb-3 flex items-center justify-between text-xs">
              <span className="text-white/40">
                {socialCount === 0
                  ? "Extra links — optional but recommended"
                  : `${socialCount} link${socialCount > 1 ? "s" : ""} added`}
              </span>
              {xVerified?.handle ? (
                <VerifiedBadge
                  handle={xVerified.handle}
                  href={xVerified.profileUrl}
                  size="sm"
                />
              ) : (
                <span className="rounded-full bg-[#00c805]/15 px-2 py-0.5 text-[10px] font-bold text-[#00c805]">
                  Builds credibility
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Website">
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                  className={inputCls}
                />
              </Field>
              <Field
                label={
                  xVerified?.handle
                    ? "X / Twitter (verified)"
                    : "X / Twitter"
                }
              >
                <input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@handle or profile URL"
                  className={inputCls}
                  readOnly={!!xVerified?.handle}
                />
              </Field>
              <Field label="Launch tweet / thread">
                <input
                  value={tweet}
                  onChange={(e) => setTweet(e.target.value)}
                  placeholder="https://x.com/.../status/..."
                  className={inputCls}
                />
              </Field>
              <Field label="Telegram">
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="t.me/yourgroup or @channel"
                  className={inputCls}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreSocial((v) => !v)}
              className="mt-3 text-xs font-semibold text-[#00c805] hover:underline"
            >
              {showMoreSocial ? "− Hide extra links" : "+ Discord, GitHub, Farcaster"}
            </button>

            {showMoreSocial && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Discord">
                  <input
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    placeholder="https://discord.gg/..."
                    className={inputCls}
                  />
                </Field>
                <Field label="GitHub">
                  <input
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className={inputCls}
                  />
                </Field>
                <Field label="Farcaster">
                  <input
                    value={farcaster}
                    onChange={(e) => setFarcaster(e.target.value)}
                    placeholder="https://warpcast.com/..."
                    className={inputCls}
                  />
                </Field>
              </div>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-white/30">
              Links are stored off-chain with your launch metadata and shown on
              the token page. They are not on-chain (no redeploy needed).
            </p>
          </Section>
        )}

        {/* STEP 2 — Supply + creator alloc + LP */}
        {step === 2 && (
          <>
            <Section
              title="Fixed total supply"
              subtitle="Hard-capped. Split between your wallet and Uniswap LP."
            >
              <div className="grid grid-cols-5 gap-2">
                {SUPPLY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setTotalSupply(p.value)}
                    className={`rounded-xl py-3 text-center transition ${
                      totalSupply === p.value
                        ? "bg-[#00c805] text-black shadow-[0_0_24px_rgba(0,200,5,0.35)]"
                        : "border border-white/10 bg-black/30 text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="text-sm font-black">{p.label}</div>
                    <div className="mt-0.5 hidden text-[9px] opacity-70 sm:block">
                      {p.full}
                    </div>
                  </button>
                ))}
              </div>
            </Section>

            <Section
              title="Creator allocation"
              subtitle="How much of the supply goes to your wallet at launch (max 10%)"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {CREATOR_ALLOC_PRESETS.map((opt) => {
                  const active = creatorBps === opt.bps;
                  return (
                    <button
                      key={opt.bps}
                      type="button"
                      onClick={() => setCreatorBps(opt.bps)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-[#00c805]/55 bg-[#00c805]/12 shadow-[0_0_28px_rgba(0,200,5,0.18)]"
                          : "border-white/10 bg-black/25 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black tracking-tight text-white">
                              {opt.pct}
                            </span>
                            <span className="text-xs font-bold text-white/55">
                              {opt.title}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold text-[#00c805]/90">
                            {opt.tagline}
                          </p>
                        </div>
                        {opt.badge && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              active
                                ? "bg-[#00c805] text-black"
                                : "bg-white/10 text-white/45"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                        {opt.body}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Visual split bar */}
              <div className="mt-4 rounded-2xl border border-white/8 bg-black/40 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-white/50">Supply split</span>
                  <span className="text-white/70">
                    {creatorPct > 0 ? (
                      <>
                        You {creatorPct}% · Pool {lpPct}%
                      </>
                    ) : (
                      <>All to pool · fair launch</>
                    )}
                  </span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                  {creatorPct > 0 && (
                    <div
                      className="bg-amber-400 transition-all"
                      style={{ width: `${Math.max(creatorPct, 2)}%` }}
                      title={`Creator ${creatorPct}%`}
                    />
                  )}
                  <div
                    className="bg-[#00c805] transition-all"
                    style={{ width: `${lpPct}%` }}
                    title={`LP ${lpPct}%`}
                  />
                </div>
                <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                  <div className="flex items-start gap-2 rounded-xl bg-black/30 px-3 py-2">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <div className="font-bold text-white/85">
                        Your wallet · {creatorPct}%
                      </div>
                      <div className="text-white/40">
                        {creatorPct === 0
                          ? "No free tokens. Buy on Uniswap after launch if you want a bag."
                          : "Minted to the wallet launching this token. Public on the token page."}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl bg-black/30 px-3 py-2">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#00c805]" />
                    <div>
                      <div className="font-bold text-white/85">
                        Uniswap LP · {lpPct}%
                      </div>
                      <div className="text-white/40">
                        Paired with your ETH. Tradable immediately on Uniswap V2.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section
              title="Initial liquidity (ETH)"
              subtitle={`Your ETH seeds the pool with the LP share of tokens · min ${MIN_LP} ETH + ${CREATE_FEE} ETH fee`}
            >
              <div className="flex flex-wrap gap-2">
                {LP_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLpEth(v)}
                    className={`rounded-xl px-4 py-2.5 text-xs font-bold ${
                      lpEth === v
                        ? "bg-[#00c805] text-black"
                        : "border border-white/10 bg-black/30 text-white/60 hover:text-white"
                    }`}
                  >
                    {v} ETH
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <Field label="Custom LP amount">
                  <input
                    type="number"
                    min={MIN_LP}
                    step="any"
                    value={lpEth}
                    onChange={(e) => setLpEth(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="mt-3 rounded-xl border border-white/8 bg-black/40 px-4 py-3 text-sm">
                <div className="flex justify-between text-white/50">
                  <span>LP into pool</span>
                  <span className="font-semibold text-white">{lpEth} ETH</span>
                </div>
                <div className="mt-1 flex justify-between text-white/50">
                  <span>Launch fee</span>
                  <span className="font-semibold text-white">
                    {CREATE_FEE} ETH
                  </span>
                </div>
                <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-bold text-white">
                  <span>Total</span>
                  <span className="text-[#00c805]">{totalEth} ETH</span>
                </div>
              </div>
            </Section>

            <Section title="LP ownership" subtitle="Choose carefully">
              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleCard
                  active={burnLp}
                  onClick={() => setBurnLp(true)}
                  title="Burn LP"
                  badge="Recommended"
                  body="Liquidity locked forever. Strongest trust signal for buyers."
                  accent="green"
                />
                <ToggleCard
                  active={!burnLp}
                  onClick={() => setBurnLp(false)}
                  title="Keep LP"
                  badge="You control"
                  body="LP tokens go to your wallet. You can earn fees or remove liquidity."
                  accent="amber"
                />
              </div>
            </Section>
          </>
        )}

        {/* STEP 3 — Review */}
        {step === 3 && (
          <Section
            title="Review & launch"
            subtitle="One transaction · Uniswap V2 on Robinhood Chain"
          >
            <div className="space-y-3 text-sm">
              <Row k="Token" v={`$${symbol || "—"} · ${name || "—"}`} />
              <Row k="Supply" v={supplyLabel} />
              <Row
                k="Creator allocation"
                v={
                  creatorBps === 0
                    ? "0% · fair launch"
                    : `${creatorPct}% → your wallet`
                }
              />
              <Row k="Into Uniswap LP" v={`${lpPct}% of supply + ${lpEth} ETH`} />
              <Row k="LP mode" v={burnLp ? "Burned (locked)" : "Kept by you"} />
              <Row
                k="X badge"
                v={
                  xVerified?.handle
                    ? `Verified @${xVerified.handle}`
                    : "Not verified"
                }
              />
              <Row k="Socials" v={socialCount ? `${socialCount} linked` : "None"} />
              <Row k="You pay" v={`${totalEth} ETH + gas`} highlight />
            </div>
            <div className="mt-4 space-y-2">
              {creatorBps === 0 ? (
                <div className="rounded-xl border border-[#00c805]/25 bg-[#00c805]/5 px-4 py-3 text-xs text-[#b8f5b8]">
                  <span className="font-bold">Fair launch.</span> 100% of supply
                  seeds the Uniswap pool. You get no free tokens — buy on Uni
                  after if you want a bag.
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
                  <span className="font-bold">
                    Creator: {creatorPct}%
                  </span>{" "}
                  of supply goes to{" "}
                  <span className="font-mono">
                    {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "your wallet"}
                  </span>
                  . The other {lpPct}% pairs with your {lpEth} ETH on Uniswap.
                  Buyers will see this on the token page.
                </div>
              )}
              <p className="px-1 text-[11px] leading-relaxed text-white/35">
                Launch fee ({CREATE_FEE} ETH) goes to the protocol. LP ETH
                becomes pool liquidity — not a fundraise you can withdraw unless
                you keep LP tokens.
              </p>
            </div>
          </Section>
        )}

        {err && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {err}
          </div>
        )}
        {msg && step < 4 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            {msg}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={busy}
              className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/70 hover:bg-white/5"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 rounded-xl bg-[#00c805] py-3 text-sm font-black text-black shadow-[0_0_24px_rgba(0,200,5,0.3)] hover:bg-[#00e006]"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onSubmit}
              className="flex-1 rounded-xl bg-[#00c805] py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(0,200,5,0.4)] hover:bg-[#00e006] disabled:opacity-40"
            >
              {busy ? "Launching on Uniswap…" : `Launch $${symbol || "TOKEN"}`}
            </button>
          )}
        </div>

        <p className="text-center font-mono text-[10px] text-white/25">
          {ROBINHOOD_CHAIN.name} · {ROBINHOOD_CHAIN.id} ·{" "}
          {configured ? `${FACTORY_ADDRESS.slice(0, 10)}…` : "factory not set"}
        </p>
      </div>

      {/* Live preview */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="hm-glass-green overflow-hidden rounded-3xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#00c805]/80">
            Live preview
          </div>
          <div className="mt-4 flex items-center gap-3">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#00c805]/30"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/40 text-xl font-black text-[#00c805] ring-2 ring-[#00c805]/25">
                {(symbol || name || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-lg font-black text-white">
                ${symbol || "TICKER"}
              </div>
              <div className="truncate text-xs text-white/45">
                {name || "Token name"}
              </div>
            </div>
          </div>
          {desc && (
            <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-white/50">
              {desc}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <PreviewStat label="Supply" value={supplyLabel} />
            <PreviewStat
              label="Creator"
              value={creatorBps === 0 ? "0% fair" : `${creatorPct}%`}
            />
            <PreviewStat label="Pool" value={`${lpPct}% + ${lpEth} ETH`} />
            <PreviewStat
              label="LP mode"
              value={burnLp ? "Burned" : "Kept"}
            />
          </div>
          <div className="mt-3 rounded-xl border border-white/8 bg-black/35 px-3 py-2.5 text-[10px] leading-relaxed text-white/45">
            {creatorBps === 0 ? (
              <>Token page will show fair launch · 100% supply in LP</>
            ) : (
              <>
                Token page badge:{" "}
                <span className="font-bold text-amber-200/90">
                  Creator: {creatorPct}%
                </span>
              </>
            )}
          </div>
          {xVerified?.handle && (
            <div className="mt-3">
              <VerifiedBadge
                handle={xVerified.handle}
                href={xVerified.profileUrl}
              />
            </div>
          )}
          {(website || twitter || telegram || tweet) && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
              {website && <Chip>🌐 Web</Chip>}
              {twitter && (
                <Chip>
                  {xVerified?.handle ? "𝕏 Verified" : "𝕏 Profile"}
                </Chip>
              )}
              {tweet && <Chip>🧵 Tweet</Chip>}
              {telegram && <Chip>✈️ TG</Chip>}
              {discord && <Chip>Discord</Chip>}
              {github && <Chip>GitHub</Chip>}
              {farcaster && <Chip>FC</Chip>}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/30 p-4 text-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Paying from
          </div>
          <div className="mt-1 break-all font-mono text-xs text-white/80">
            {address}
          </div>
          <div className="mt-1 text-xs text-white/45">
            {ethBalance} ETH · {mode === "session" ? "quick wallet" : "browser"}
          </div>
          <Link
            href="/account"
            className="mt-2 inline-block text-xs font-semibold text-[#00c805] hover:underline"
          >
            Manage wallet →
          </Link>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-[11px] leading-relaxed text-white/40">
          <p className="font-semibold text-white/60">Crystal clear rules</p>
          <ul className="mt-2 space-y-1.5 list-none">
            <li>
              <span className="text-white/55">Creator %</span> — tokens sent to
              your wallet at mint. Capped at 10%.
            </li>
            <li>
              <span className="text-white/55">Rest of supply</span> — locked into
              Uniswap with the ETH you pay as LP.
            </li>
            <li>
              <span className="text-white/55">Socials</span> — off-chain on the
              token page so buyers can verify you.
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function SuccessPanel({
  symbol,
  token,
  pair,
  burnLp,
  creatorBps,
  imagePreview,
  socials,
}: {
  symbol: string;
  token: string;
  pair: string;
  burnLp: boolean;
  creatorBps: number;
  imagePreview?: string | null;
  socials: {
    website?: string;
    twitter?: string;
    tweet?: string;
    telegram?: string;
    discord?: string;
  };
}) {
  const pct = creatorBps / 100;
  const pageUrl = `https://www.hoodmemes.fun/token/${token}${pair ? `?pair=${pair}` : ""}`;
  const tweetText = `$${symbol} just launched on Robinhood Chain via @hoodmemesdotfun\n\nCA: ${token}\n${pageUrl}`;
  const tweetIntent = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <div className="mx-auto max-w-lg space-y-5 py-4 text-center">
      <div className="hm-glass-green rounded-3xl p-8">
        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt=""
            className="mx-auto h-20 w-20 rounded-2xl object-cover ring-2 ring-[#00c805]/40"
          />
        ) : (
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#00c805]">
            Launch complete
          </div>
        )}
        <h2 className="mt-3 text-3xl font-black text-white">
          ${symbol} is live
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Uniswap V2 pool seeded
          {burnLp ? " · LP burned" : " · you hold LP"}
          {creatorBps > 0
            ? ` · Creator ${pct}% in your wallet`
            : " · fair launch"}
          {imagePreview ? " · logo saved on HoodMemes" : ""}
        </p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(token)}
          className="mt-4 w-full break-all rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-[11px] text-white/60 hover:border-[#00c805]/40 hover:text-white"
        >
          {token}
          <span className="mt-1 block font-sans text-[10px] font-bold text-[#00c805]">
            Tap to copy CA
          </span>
        </button>
        {pair && (
          <p className="mt-2 break-all font-mono text-[10px] text-white/30">
            pair {pair}
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={`/token/${token}${pair ? `?pair=${pair}` : ""}`}
          className="rounded-xl bg-[#00c805] px-5 py-3 text-sm font-black text-black"
        >
          Token page
        </Link>
        <a
          href={tweetIntent}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-5 py-3 text-sm font-bold text-sky-100"
        >
          Post on X
        </a>
        <a
          href={`https://app.uniswap.org/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${token}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white"
        >
          Uniswap
        </a>
        {pair && (
          <a
            href={`https://dexscreener.com/robinhood/${pair}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white"
          >
            DexScreener chart
          </a>
        )}
      </div>

      {/* Legit stack */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#00c805]">
          Legit stack
        </div>
        <ul className="space-y-2 text-[12px] leading-relaxed text-white/50">
          <li>
            <strong className="text-white/80">HoodMemes</strong> — logo + socials
            live on your token page and our{" "}
            <Link href="/tokenlist" className="text-[#00c805] hover:underline">
              token list
            </Link>
            .
          </li>
          <li>
            <strong className="text-white/80">DexScreener logo (optional, paid)</strong>{" "}
            — they have no free API. Use Enhanced Token Info: chain{" "}
            <em>Robinhood</em>, paste CA, upload logo.
          </li>
        </ul>
        <a
          href="https://marketplace.dexscreener.com/product/token-info"
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-100"
        >
          Set logo on DexScreener (paid) ↗
        </a>
        <p className="text-[10px] text-white/30">
          CA for the form:{" "}
          <span className="font-mono text-white/45">{token}</span>
        </p>
      </div>

      {(socials.website || socials.twitter || socials.telegram) && (
        <p className="text-xs text-white/40">
          Socials attached to the token page for authority.
        </p>
      )}
      {!burnLp && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/80">
          You kept LP — you can remove liquidity later. Buyers will see this.
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hm-glass space-y-4 rounded-3xl p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  k,
  v,
  highlight,
}: {
  k: string;
  v: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 rounded-xl px-3 py-2.5 ${
        highlight ? "bg-[#00c805]/10 text-[#00c805]" : "bg-black/30 text-white/80"
      }`}
    >
      <span className={highlight ? "" : "text-white/45"}>{k}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-white/35">
        {label}
      </div>
      <div className="font-bold text-white/90">{value}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg bg-black/35 px-2 py-1 text-[10px] font-semibold text-white/70">
      {children}
    </span>
  );
}

function ToggleCard({
  active,
  onClick,
  title,
  badge,
  body,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  badge: string;
  body: string;
  accent: "green" | "amber";
}) {
  const on =
    accent === "green"
      ? "border-[#00c805]/50 bg-[#00c805]/10"
      : "border-amber-500/45 bg-amber-500/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active ? on : "border-white/10 bg-black/25 hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-white">{title}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
            active
              ? accent === "green"
                ? "bg-[#00c805] text-black"
                : "bg-amber-400 text-black"
              : "bg-white/10 text-white/40"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-white/45">{body}</p>
    </button>
  );
}
