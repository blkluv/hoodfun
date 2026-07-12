"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { QuickWallet } from "@/components/QuickWallet";
import { useAuth } from "@/components/AuthProvider";
import { shortAddr } from "@/lib/format";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { useState } from "react";
import { ConnectModal } from "@/components/ConnectModal";

export default function AccountPage() {
  return (
    <RequireAuth
      title="Log in to manage your wallet"
      blurb="Quick wallet details and export are private to your session — never shown on public pages."
    >
      <AccountInner />
    </RequireAuth>
  );
}

function AccountInner() {
  const {
    address,
    mode,
    ethBalance,
    logout,
    loginWithInjected,
    loginWithSession,
    refreshBalance,
  } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Account</h1>
        <p className="mt-1 text-sm text-white/45">
          Active signing method for launches and trades.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Active wallet
        </div>
        <div className="font-mono text-sm text-white break-all">{address}</div>
        <div className="flex flex-wrap gap-3 text-sm text-white/60">
          <span>
            Mode:{" "}
            <strong className="text-white">
              {mode === "session" ? "Quick wallet" : "Browser wallet"}
            </strong>
          </span>
          <span>
            Balance: <strong className="text-white">{ethBalance} ETH</strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => refreshBalance()}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setSwitchOpen(true)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70"
          >
            Switch method
          </button>
          <a
            href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70"
          >
            Explorer ↗
          </a>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300"
          >
            Log out
          </button>
        </div>
      </div>

      {mode === "session" && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white/70">Quick wallet secrets</h2>
          <p className="text-xs text-white/40">
            Only visible while logged in with quick wallet. Deposit ETH to{" "}
            <code className="text-white/60">{shortAddr(address || "", 6)}</code>{" "}
            on Robinhood Chain.
          </p>
          <QuickWallet />
        </div>
      )}

      {mode === "external" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/45">
          Using MetaMask / browser wallet. Approvals appear in your extension.
          Prefer quick wallet for one-click trench trading.
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => loginWithSession()}
              className="rounded-lg bg-[#00c805]/15 px-3 py-1.5 text-[#00c805]"
            >
              Switch to quick wallet
            </button>
            <button
              type="button"
              onClick={() => loginWithInjected()}
              className="rounded-lg border border-white/15 px-3 py-1.5"
            >
              Reconnect browser wallet
            </button>
          </div>
        </div>
      )}

      <ConnectModal
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        title="Switch login method"
      />
    </div>
  );
}
