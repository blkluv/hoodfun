"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export type XVerification = {
  verified: boolean;
  address?: string;
  handle?: string;
  profileUrl?: string;
  verifiedAt?: number;
  tweetUrl?: string;
};

type Challenge = {
  handle: string;
  code: string;
  message: string;
  tweetText: string;
  composeUrl: string;
  expiresAt: number;
};

type Props = {
  /** compact for create wizard; full for account */
  variant?: "full" | "compact";
  /** when verified, push handle into parent (e.g. create form twitter field) */
  onVerified?: (v: XVerification) => void;
  className?: string;
};

export function VerifyXPanel({
  variant = "full",
  onVerified,
  className = "",
}: Props) {
  const { address, isLoggedIn, signMessage } = useAuth();
  const [status, setStatus] = useState<XVerification | null>(null);
  const [handle, setHandle] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [tweetUrl, setTweetUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"tweet" | "msg" | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setStatus(null);
      return;
    }
    try {
      const res = await fetch(`/api/verify-x?address=${address}`);
      const data = (await res.json()) as XVerification;
      setStatus(data);
      if (data.verified && data.handle) {
        setHandle(data.handle);
        onVerified?.(data);
      }
    } catch {
      setStatus({ verified: false });
    }
  }, [address, onVerified]);

  useEffect(() => {
    load();
  }, [load]);

  async function startChallenge() {
    setErr(null);
    setSignature(null);
    setTweetUrl("");
    if (!address) {
      setErr("Log in first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/verify-x/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, handle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      if (data.alreadyVerified) {
        setStatus({
          verified: true,
          address: data.address,
          handle: data.handle,
          profileUrl: data.profileUrl,
          verifiedAt: data.verifiedAt,
        });
        onVerified?.(data);
        setChallenge(null);
        return;
      }
      setChallenge({
        handle: data.handle,
        code: data.code,
        message: data.message,
        tweetText: data.tweetText,
        composeUrl: data.composeUrl,
        expiresAt: data.expiresAt,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function signChallenge() {
    if (!challenge) return;
    setErr(null);
    setBusy(true);
    try {
      const sig = await signMessage(challenge.message);
      setSignature(sig);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign rejected");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!address || !challenge || !signature) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/verify-x/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          handle: challenge.handle,
          signature,
          tweetUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setStatus({
        verified: true,
        address: data.address,
        handle: data.handle,
        profileUrl: data.profileUrl,
        verifiedAt: data.verifiedAt,
        tweetUrl: data.tweetUrl,
      });
      onVerified?.(data);
      setChallenge(null);
      setSignature(null);
      setTweetUrl("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    if (!address) return;
    setErr(null);
    setBusy(true);
    try {
      const message = `Unlink X verification on hoodmemes.fun\nWallet: ${address.toLowerCase()}`;
      const sig = await signMessage(message);
      const res = await fetch("/api/verify-x", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature: sig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unlink failed");
      setStatus({ verified: false });
      setChallenge(null);
      setSignature(null);
      onVerified?.({ verified: false });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unlink failed");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, kind: "tweet" | "msg") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  if (!isLoggedIn || !address) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/45 ${className}`}
      >
        Log in to link your X account and earn a verified launcher badge.
      </div>
    );
  }

  // ── Already verified ──
  if (status?.verified && status.handle) {
    return (
      <div
        className={`rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 ${className}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <VerifiedBadge handle={status.handle} href={status.profileUrl} />
          <span className="text-xs text-white/50">
            Linked to this wallet · buyers see this on your token page
          </span>
        </div>
        {variant === "full" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {status.profileUrl && (
              <a
                href={status.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/5"
              >
                Open profile ↗
              </a>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={unlink}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/45 hover:border-rose-500/30 hover:text-rose-300"
            >
              Unlink
            </button>
          </div>
        )}
        {err && (
          <p className="mt-2 text-xs text-rose-300">{err}</p>
        )}
      </div>
    );
  }

  // ── Flow ──
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white">
              Verified launcher
            </span>
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-300">
              X badge
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-white/40">
            Prove you own an X account. Your launches show a{" "}
            <strong className="text-sky-300/90">Verified</strong> badge linked
            to your profile — not just a typed URL.
          </p>
        </div>
      </div>

      {!challenge ? (
        <div className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Your X handle
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">
                  @
                </span>
                <input
                  value={handle}
                  onChange={(e) =>
                    setHandle(e.target.value.replace(/^@/, "").trim())
                  }
                  placeholder="yourhandle"
                  maxLength={15}
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-8 pr-3 text-sm text-white outline-none focus:border-sky-400/50"
                />
              </div>
              <button
                type="button"
                disabled={busy || !handle.trim()}
                onClick={startChallenge}
                className="shrink-0 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-sky-400 disabled:opacity-40"
              >
                {busy ? "…" : "Continue"}
              </button>
            </div>
          </label>
          <ol className="list-decimal space-y-1 pl-4 text-[11px] text-white/35">
            <li>Sign a message with your wallet (proves wallet control)</li>
            <li>Post a public tweet with a one-time code (proves X ownership)</li>
            <li>Paste the tweet link — we check both and mint your badge</li>
          </ol>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-100/80">
            Linking <strong>@{challenge.handle}</strong>
            <span className="text-white/35">
              {" "}
              · code{" "}
              <span className="font-mono font-bold text-sky-200">
                {challenge.code}
              </span>
            </span>
          </div>

          {/* Step 1 sign */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Step 1 · Sign with wallet
            </div>
            {signature ? (
              <div className="rounded-xl border border-[#00c805]/25 bg-[#00c805]/10 px-3 py-2 text-xs font-semibold text-[#00c805]">
                ✓ Signed
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={signChallenge}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
              >
                {busy ? "Waiting for signature…" : "Sign verification message"}
              </button>
            )}
          </div>

          {/* Step 2 tweet */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Step 2 · Post this tweet from @{challenge.handle}
            </div>
            <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/50 p-3 font-sans text-[11px] leading-relaxed text-white/70">
              {challenge.tweetText}
            </pre>
            <div className="flex flex-wrap gap-2">
              <a
                href={challenge.composeUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-black hover:bg-sky-400"
              >
                Open X compose ↗
              </a>
              <button
                type="button"
                onClick={() => copy(challenge.tweetText, "tweet")}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/70"
              >
                {copied === "tweet" ? "Copied!" : "Copy text"}
              </button>
            </div>
          </div>

          {/* Step 3 paste */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Step 3 · Paste tweet URL
            </div>
            <input
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://x.com/yourhandle/status/…"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/50"
            />
            <button
              type="button"
              disabled={busy || !signature || !tweetUrl.trim()}
              onClick={confirm}
              className="w-full rounded-xl bg-[#00c805] py-3 text-sm font-black text-black shadow-[0_0_24px_rgba(0,200,5,0.25)] hover:bg-[#00e006] disabled:opacity-40"
            >
              {busy ? "Checking tweet…" : "Verify & get badge"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setChallenge(null);
              setSignature(null);
              setErr(null);
            }}
            className="text-xs text-white/40 hover:text-white/70"
          >
            ← Start over
          </button>
        </div>
      )}

      {err && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {err}
        </div>
      )}
    </div>
  );
}

export function VerifiedBadge({
  handle,
  href,
  size = "md",
}: {
  handle: string;
  href?: string;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  const inner = (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-sky-500/20 font-bold uppercase tracking-wide text-sky-300 ring-1 ring-sky-400/30 ${pad}`}
      title={`Verified launcher · @${handle}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"}
        fill="currentColor"
        aria-hidden
      >
        <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
      @{handle}
    </span>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex">
        {inner}
      </a>
    );
  }
  return inner;
}
