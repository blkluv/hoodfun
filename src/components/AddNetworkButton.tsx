"use client";

import { useState } from "react";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { ensureRobinhoodChain } from "@/lib/wallet-tx";

export function AddNetworkButton({
  className = "",
  label = "Add Robinhood network",
}: {
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setMsg(null);
    try {
      const eth = (
        window as unknown as {
          ethereum?: {
            request: (args: {
              method: string;
              params?: unknown[];
            }) => Promise<unknown>;
          };
        }
      ).ethereum;
      if (!eth) {
        setMsg("Install MetaMask / Rabby first");
        return;
      }
      await ensureRobinhoodChain(eth);
      setMsg(`Switched to ${ROBINHOOD_CHAIN.name}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to add chain");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/80 transition hover:border-[#ccff00]/40 hover:text-white disabled:opacity-50"
      >
        <span className="h-2 w-2 rounded-full bg-[#ccff00]" />
        {busy ? "Switching…" : label}
      </button>
      {msg && (
        <p className="mt-1 text-[10px] text-white/40">{msg}</p>
      )}
    </div>
  );
}
