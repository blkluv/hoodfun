"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther, type Hex } from "viem";
import {
  clearSessionWallet,
  exportSessionPrivateKey,
  getOrCreateSessionWallet,
  getSessionEthBalance,
  importSessionWallet,
} from "@/lib/sessionWallet";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

export function QuickWallet({ compact = false }: { compact?: boolean }) {
  const [address, setAddress] = useState<string | null>(null);
  const [bal, setBal] = useState<string>("—");
  const [showKey, setShowKey] = useState(false);
  const [pk, setPk] = useState<string | null>(null);
  const [importVal, setImportVal] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const { account } = getOrCreateSessionWallet();
    setAddress(account.address);
    try {
      const b = await getSessionEthBalance();
      setBal(Number(formatEther(b)).toFixed(5));
    } catch {
      setBal("?");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 12_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function copyAddr() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function revealKey() {
    const k = exportSessionPrivateKey();
    setPk(k);
    setShowKey(true);
  }

  function doImport() {
    try {
      importSessionWallet(importVal.trim() as Hex);
      setImportVal("");
      setShowKey(false);
      refresh();
    } catch {
      alert("Invalid private key");
    }
  }

  function reset() {
    if (
      !confirm(
        "Destroy this quick wallet on this browser? Export the key first if you have funds."
      )
    )
      return;
    clearSessionWallet();
    getOrCreateSessionWallet();
    setShowKey(false);
    setPk(null);
    refresh();
  }

  if (!address) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/50">
        Loading quick wallet…
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-[#00c805]/25 bg-[#00c805]/[0.06] ${compact ? "p-3" : "p-4"} space-y-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#00c805]">
            Quick wallet · no MetaMask
          </div>
          <p className="mt-0.5 text-[11px] text-white/45">
            Deposit ETH on {ROBINHOOD_CHAIN.name}, trade in one click. Key stays
            in this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="text-[11px] text-white/40 hover:text-white"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-black/40 px-2 py-1 font-mono text-xs text-white/90">
          {compact ? shortAddr(address, 6) : address}
        </code>
        <button
          type="button"
          onClick={copyAddr}
          className="rounded-lg bg-[#00c805] px-2.5 py-1 text-xs font-bold text-black"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-white/40">Balance </span>
          <span className="font-semibold text-white">{bal} ETH</span>
        </div>
        <a
          href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-white/40 hover:text-[#00c805]"
        >
          Explorer ↗
        </a>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={revealKey}
            className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/5"
          >
            Export key
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-[11px] text-rose-300/80 hover:bg-rose-500/10"
          >
            Reset wallet
          </button>
        </div>
      )}

      {showKey && pk && (
        <div className="space-y-2 rounded-xl bg-black/50 p-3">
          <p className="text-[11px] text-amber-200/90">
            Anyone with this key owns the funds. Never share it.
          </p>
          <code className="block break-all font-mono text-[10px] text-white/70">
            {pk}
          </code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(pk)}
            className="text-[11px] text-[#00c805]"
          >
            Copy private key
          </button>
        </div>
      )}

      {!compact && (
        <div className="flex gap-2">
          <input
            value={importVal}
            onChange={(e) => setImportVal(e.target.value)}
            placeholder="Import private key (0x…)"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-white outline-none focus:border-[#00c805]/40"
          />
          <button
            type="button"
            onClick={doImport}
            className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/80"
          >
            Import
          </button>
        </div>
      )}
    </div>
  );
}
