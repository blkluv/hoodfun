"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Address, Hex } from "viem";
import { useAuth } from "./AuthProvider";
import { getPublicClient } from "@/lib/wallet-tx";
import {
  estimateFeesForToken,
  formatFeeEth,
  formatFeeTokens,
  type FeePosition,
} from "@/lib/v3-fees";
import { lockerAbi, V3_LOCKER_ADDRESS } from "@/lib/v3-fees";
import { shortAddr } from "@/lib/format";
import { ROBINHOOD_CHAIN } from "@/lib/chain";

type LocalLaunch = {
  token: string;
  symbol?: string;
  name?: string;
  pair?: string;
  creator?: string;
  v3?: boolean;
};

function loadLocalLaunches(address: string | null): string[] {
  const out = new Set<string>();
  try {
    const raw = localStorage.getItem("hoodmemes_launches");
    if (raw) {
      const list = JSON.parse(raw) as LocalLaunch[];
      for (const x of list) {
        if (!x.token || !/^0x[a-fA-F0-9]{40}$/i.test(x.token)) continue;
        if (
          address &&
          x.creator &&
          x.creator.toLowerCase() !== address.toLowerCase()
        ) {
          continue;
        }
        out.add(x.token.toLowerCase());
      }
    }
  } catch {
    /* */
  }
  return [...out];
}

export function CreatorFeesPanel({
  /** Single token mode (token page). Omit for multi (account). */
  tokenAddress,
  compact = false,
}: {
  tokenAddress?: string;
  compact?: boolean;
}) {
  const { address, isLoggedIn, writeContract, refreshBalance } = useAuth();
  const [rows, setRows] = useState<FeePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const pc = getPublicClient();
      const tokens: string[] = [];
      if (tokenAddress && /^0x[a-fA-F0-9]{40}$/i.test(tokenAddress)) {
        tokens.push(tokenAddress);
      } else if (address) {
        tokens.push(...loadLocalLaunches(address));
      }
      if (!tokens.length) {
        setRows([]);
        return;
      }
      const results = await Promise.all(
        tokens.map((t) =>
          estimateFeesForToken(pc, t as Address).catch(() => null)
        )
      );
      let list = results.filter((r): r is FeePosition => r != null);
      // Account page: only positions where user is creator or reward recipient
      if (!tokenAddress && address) {
        const me = address.toLowerCase();
        list = list.filter(
          (r) =>
            r.creator.toLowerCase() === me ||
            r.rewardRecipient.toLowerCase() === me
        );
      }
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }, [address, tokenAddress]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 45_000);
    return () => clearInterval(id);
  }, [refresh]);

  const claim = async (positionId: bigint, key: string) => {
    if (!isLoggedIn) {
      setErr("Log in to claim fees");
      return;
    }
    setBusyId(key);
    setMsg(null);
    setErr(null);
    try {
      const hash = (await writeContract({
        address: V3_LOCKER_ADDRESS as Address,
        abi: lockerAbi,
        functionName: "collect",
        args: [positionId],
      })) as Hex;
      setMsg(`Claimed · ${hash.slice(0, 10)}…`);
      await refreshBalance();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setBusyId(null);
    }
  };

  const claimAll = async () => {
    if (!isLoggedIn || rows.length === 0) return;
    setBusyId("all");
    setMsg(null);
    setErr(null);
    try {
      const ids = rows.map((r) => r.positionId);
      const hash = (await writeContract({
        address: V3_LOCKER_ADDRESS as Address,
        abi: lockerAbi,
        functionName: "collectMany",
        args: [ids],
      })) as Hex;
      setMsg(`Claimed all · ${hash.slice(0, 10)}…`);
      await refreshBalance();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Claim all failed");
    } finally {
      setBusyId(null);
    }
  };

  const hasFees = (r: FeePosition) =>
    r.creatorEthWei > 0n || r.creatorMemeWei > 0n;

  if (tokenAddress && !loading && rows.length === 0) {
    return null; // not a V3 hood launch
  }

  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-[#ccff00]/25 bg-[#ccff00]/[0.06] p-4"
          : "rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#ccff00]">
            Creator fees
          </div>
          <p className="mt-1 text-xs text-white/45">
            {rows[0]
              ? `${(rows[0].creatorShareBps / 100).toFixed(0)}% of V3 pool swap fees · LP locked forever`
              : "50% of V3 pool swap fees · claim anytime"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/50 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="text-xs text-white/40">Checking locked positions…</p>
      )}

      {!loading && rows.length === 0 && !tokenAddress && (
        <p className="text-xs text-white/40">
          No V3 launches linked to this wallet yet.{" "}
          <Link href="/create" className="font-semibold text-[#ccff00]">
            Launch a coin
          </Link>{" "}
          to start earning fees.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => {
            const key = r.positionId.toString();
            const mine =
              address &&
              (r.creator.toLowerCase() === address.toLowerCase() ||
                r.rewardRecipient.toLowerCase() === address.toLowerCase());
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/token/${r.token}`}
                      className="font-black text-white hover:text-[#ccff00]"
                    >
                      ${r.symbol}
                    </Link>
                    <span className="font-mono text-[10px] text-white/30">
                      #{r.positionId.toString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-white/55">
                    <span className="font-semibold text-[#ccff00]">
                      ~{formatFeeEth(r.creatorEthWei)} ETH
                    </span>
                    {r.creatorMemeWei > 0n && (
                      <span className="text-white/40">
                        {" "}
                        + {formatFeeTokens(r.creatorMemeWei, r.decimals)} $
                        {r.symbol}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-white/25">
                    {shortAddr(r.token, 5)} · your share{" "}
                    {(r.creatorShareBps / 100).toFixed(0)}%
                  </div>
                </div>
                <button
                  type="button"
                  disabled={
                    !isLoggedIn ||
                    !mine ||
                    busyId === key ||
                    busyId === "all" ||
                    !hasFees(r)
                  }
                  onClick={() => claim(r.positionId, key)}
                  className="rounded-xl bg-[#ccff00] px-4 py-2 text-xs font-black text-black disabled:opacity-40"
                >
                  {busyId === key
                    ? "Claiming…"
                    : !hasFees(r)
                      ? "Nothing yet"
                      : "Claim"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 1 && (
        <button
          type="button"
          disabled={!isLoggedIn || busyId != null || !rows.some(hasFees)}
          onClick={claimAll}
          className="w-full rounded-xl border border-[#ccff00]/40 bg-[#ccff00]/10 py-2.5 text-sm font-bold text-[#ccff00] disabled:opacity-40"
        >
          {busyId === "all" ? "Claiming all…" : "Claim all fees"}
        </button>
      )}

      {tokenAddress && rows[0] && !isLoggedIn && (
        <p className="text-[11px] text-white/40">
          Log in as the creator wallet to claim.
        </p>
      )}

      {msg && <p className="text-[11px] text-[#ccff00]">{msg}</p>}
      {err && <p className="text-[11px] text-rose-300 break-all">{err}</p>}

      <a
        href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${V3_LOCKER_ADDRESS}`}
        target="_blank"
        rel="noreferrer"
        className="block text-[10px] text-white/30 hover:text-white/50"
      >
        Locker on explorer ↗
      </a>
    </div>
  );
}
