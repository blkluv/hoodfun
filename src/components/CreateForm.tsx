"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseEther, decodeEventLog, type Hex, zeroAddress } from "viem";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { factoryAbi } from "@/lib/abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";
import { fomoTokenUrl } from "@/lib/dex-links";
import { getPublicClient } from "@/lib/wallet-tx";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { VerifyXPanel, VerifiedBadge, type XVerification } from "./VerifyXPanel";
import { compressImageFile } from "@/lib/image-compress";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#00c805]/50 focus:ring-1 focus:ring-[#00c805]/25";

/** Matches DeployV3 default launchFee */
const LAUNCH_FEE = "0.0005";
/** ETH used as creator's first buy (seeds price action for indexers) */
const MIN_BUY = "0.01";
const BUY_PRESETS = ["0.01", "0.05", "0.1", "0.2", "0.5"] as const;

function randomSalt(): `0x${string}` {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return (`0x${Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  )}`) as `0x${string}`;
}

export function CreateForm() {
  const { address, mode, ethBalance, writeContract, refreshBalance } = useAuth();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [desc, setDesc] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  /** ETH spent as initial buy (on top of launch fee) */
  const [buyEth, setBuyEth] = useState("0.05");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [launched, setLaunched] = useState<{
    token: string;
    pool: string;
  } | null>(null);

  const configured = isFactoryConfigured();

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

  const totalEth = useMemo(() => {
    const buy = Number(buyEth) || 0;
    return (buy + Number(LAUNCH_FEE)).toFixed(4);
  }, [buyEth]);

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
      const buy = Number(buyEth);
      if (!Number.isFinite(buy) || buy < Number(MIN_BUY)) {
        return `Initial buy must be at least ${MIN_BUY} ETH (for Fomo/Dex activity)`;
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
      setErr("Factory not configured. Deploy V3 and set NEXT_PUBLIC_FACTORY_ADDRESS.");
      return;
    }
    if (!address) {
      setErr("Connect a wallet first");
      return;
    }

    setBusy(true);
    try {
      const publicClient = getPublicClient();
      const fee = parseEther(LAUNCH_FEE);
      const buyWei = parseEther(buyEth || "0");
      const value = fee + buyWei;
      const userSalt = randomSalt();
      const metadataURI = website.trim() || `https://www.hoodmemes.fun`;

      const hash = await writeContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: factoryAbi,
        functionName: "launchToken",
        args: [
          {
            name: name.trim(),
            symbol: symbol.trim().toUpperCase(),
            metadataURI,
            rewardRecipient: zeroAddress,
          },
          0n, // configId — 1B / tick -204200
          0n, // dexId — Uni V3 1%
          userSalt,
          0n, // minTokensOut
        ],
        value,
      });

      setMsg(`Submitted ${hash.slice(0, 12)}… confirming`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as Hex,
      });

      let token = "";
      let pool = "";
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: factoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "TokenLaunched") {
            const args = ev.args as {
              token: string;
              pool: string;
            };
            token = args.token;
            pool = args.pool;
          }
        } catch {
          /* skip */
        }
      }

      if (token) {
        setLaunched({ token, pool });

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
            /* non-fatal */
          }
        }

        try {
          await fetch("/api/launch-meta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              pair: pool,
              pool,
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
              lpBurned: true, // V3 LP locked forever
              buyEth,
              totalSupply: (1_000_000_000n * 10n ** 18n).toString(),
              creatorBps: 0,
              v3: true,
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
            pair: pool,
            pool,
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
            buyEth,
            v3: true,
            instant: true,
          });
          localStorage.setItem(key, JSON.stringify(prev.slice(0, 100)));
        } catch {
          /* ignore */
        }
        setMsg(`$${symbol.toUpperCase()} is live on Uniswap V3.`);
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
        pool={launched.pool}
        buyEth={buyEth}
        imagePreview={imagePreview}
        socials={{ website, twitter, tweet, telegram, discord }}
      />
    );
  }

  const steps = ["Identity", "Authority", "Buy-in", "Review"];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
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

        {step === 0 && (
          <Section
            title="Token identity"
            subtitle="Uniswap V3 direct launch · 1B supply · LP locked forever"
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
                  xVerified?.handle ? "X / Twitter (verified)" : "X / Twitter"
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
                  placeholder="t.me/yourgroup"
                  className={inputCls}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreSocial((v) => !v)}
              className="mt-3 text-xs font-semibold text-[#00c805] hover:underline"
            >
              {showMoreSocial
                ? "− Hide extra links"
                : "+ Discord, GitHub, Farcaster"}
            </button>

            {showMoreSocial && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Discord">
                  <input
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="GitHub">
                  <input
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Farcaster">
                  <input
                    value={farcaster}
                    onChange={(e) => setFarcaster(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </Section>
        )}

        {step === 2 && (
          <Section
            title="Initial buy"
            subtitle="100% supply → single-sided V3 LP (locked). Your ETH is the first buy — same model as LaunchHood."
          >
            <div className="rounded-xl border border-[#00c805]/25 bg-[#00c805]/8 px-4 py-3 text-[12px] leading-relaxed text-white/70">
              <strong className="text-[#00c805]">How it works</strong>
              <ul className="mt-2 space-y-1 list-disc pl-4 text-white/55">
                <li>1B tokens land in a Uni V3 1% pool (one-sided, locked forever)</li>
                <li>Starting FDV ≈ ~1.37 ETH (~$2.4k at ~$1.8k/ETH)</li>
                <li>Your ETH (minus {LAUNCH_FEE} fee) buys tokens in the same tx</li>
                <li>2% max-wallet anti-snipe for ~366 blocks after your buy</li>
                <li>You earn 50% of trading fees forever (locker)</li>
              </ul>
            </div>

            <Field label={`Initial buy ETH (min ${MIN_BUY})`}>
              <div className="mb-2 flex flex-wrap gap-2">
                {BUY_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBuyEth(v)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      buyEth === v
                        ? "bg-[#00c805] text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    {v} ETH
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={MIN_BUY}
                step="0.01"
                value={buyEth}
                onChange={(e) => setBuyEth(e.target.value)}
                className={inputCls}
              />
            </Field>

            <div className="space-y-1 text-sm">
              <Row k="Initial buy" v={`${buyEth} ETH`} />
              <Row k="Launch fee" v={`${LAUNCH_FEE} ETH`} />
              <Row k="Total from wallet" v={`${totalEth} ETH`} highlight />
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section
            title="Review & launch"
            subtitle="One transaction · Uniswap V3 on Robinhood Chain"
          >
            <div className="space-y-1 text-sm">
              <Row k="Name" v={name} />
              <Row k="Ticker" v={`$${symbol.toUpperCase()}`} />
              <Row k="Supply" v="1 Billion (fixed)" />
              <Row k="AMM" v="Uniswap V3 · 1% fee" />
              <Row k="LP" v="100% tokens · locked forever" />
              <Row k="Your buy" v={`${buyEth} ETH → tokens to you`} />
              <Row k="Fee share" v="50% of pool fees to you" />
              <Row k="Total pay" v={`${totalEth} ETH`} highlight />
            </div>
            {!configured && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                Deploy HoodV3Factory first and set NEXT_PUBLIC_FACTORY_ADDRESS.
              </p>
            )}
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
              disabled={busy || !configured}
              onClick={onSubmit}
              className="flex-1 rounded-xl bg-[#00c805] py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(0,200,5,0.4)] hover:bg-[#00e006] disabled:opacity-40"
            >
              {busy ? "Launching on Uniswap V3…" : `Launch $${symbol || "TOKEN"}`}
            </button>
          )}
        </div>

        <p className="text-center font-mono text-[10px] text-white/25">
          {ROBINHOOD_CHAIN.name} · {ROBINHOOD_CHAIN.id} · V3 ·{" "}
          {configured ? `${FACTORY_ADDRESS.slice(0, 10)}…` : "factory not set"}
        </p>
      </div>

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
            <PreviewStat label="Supply" value="1B" />
            <PreviewStat label="AMM" value="Uni V3 1%" />
            <PreviewStat label="Your buy" value={`${buyEth} ETH`} />
            <PreviewStat label="LP" value="Locked" />
          </div>
          {xVerified?.handle && (
            <div className="mt-3">
              <VerifiedBadge
                handle={xVerified.handle}
                href={xVerified.profileUrl}
              />
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
          <p className="font-semibold text-white/60">V3 launch rules</p>
          <ul className="mt-2 space-y-1.5 list-none">
            <li>
              <span className="text-white/55">No free creator bag</span> — you
              buy with ETH in the launch tx.
            </li>
            <li>
              <span className="text-white/55">LP NFT</span> — locked forever;
              only trading fees can be collected.
            </li>
            <li>
              <span className="text-white/55">Fomo / Dex</span> — V3 pool + first
              swap in one block = instant indexing.
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
  pool,
  buyEth,
  imagePreview,
  socials,
}: {
  symbol: string;
  token: string;
  pool: string;
  buyEth: string;
  imagePreview?: string | null;
  socials: {
    website?: string;
    twitter?: string;
    tweet?: string;
    telegram?: string;
    discord?: string;
  };
}) {
  const pageUrl = `https://www.hoodmemes.fun/token/${token}${pool ? `?pair=${pool}` : ""}`;
  const fomoUrl = fomoTokenUrl(token);
  const tweetText = `$${symbol} just launched on Robinhood Chain via HoodMemes (Uniswap V3)\n\nCA: ${token}\n${pageUrl}\n${fomoUrl}`;
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
          Uniswap V3 · LP locked · {buyEth} ETH initial buy
          {imagePreview ? " · logo saved" : ""}
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
        {pool && (
          <p className="mt-2 break-all font-mono text-[10px] text-white/30">
            pool {pool}
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={`/token/${token}${pool ? `?pair=${pool}` : ""}`}
          className="rounded-xl bg-[#00c805] px-5 py-3 text-sm font-black text-black"
        >
          Token page
        </Link>
        <a
          href={fomoUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-5 py-3 text-sm font-bold text-fuchsia-100"
        >
          Open on Fomo
        </a>
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
        {pool && (
          <a
            href={`https://dexscreener.com/robinhood/${pool}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white sm:col-span-2"
          >
            DexScreener chart
          </a>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left space-y-2 text-[12px] text-white/50">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#00c805]">
          Share
        </div>
        <p className="break-all font-mono text-[11px] text-white/40">{fomoUrl}</p>
        {(socials.website || socials.twitter || socials.telegram) && (
          <p>Socials attached to the token page.</p>
        )}
      </div>
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

