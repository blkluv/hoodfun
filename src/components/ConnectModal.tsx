"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function ConnectModal({
  open,
  onClose,
  title = "Log in to HoodMemes",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
}) {
  const { loginWithInjected, loginWithSession } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function mm() {
    setBusy(true);
    setErr(null);
    try {
      await loginWithInjected();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  function qw() {
    setErr(null);
    loginWithSession();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d120e] p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/45">
          Connect a browser wallet or use a private quick wallet for one-click
          trades. Keys never leave your device.
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={mm}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-[#00c805]/40 hover:bg-white/[0.08] disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20 text-lg">
              🦊
            </span>
            <span>
              <span className="block font-semibold text-white">
                MetaMask / browser wallet
              </span>
              <span className="text-xs text-white/40">
                Rabby, Coinbase Wallet, injected EIP-1193
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={qw}
            className="flex w-full items-center gap-3 rounded-xl border border-[#00c805]/30 bg-[#00c805]/10 px-4 py-3 text-left transition hover:bg-[#00c805]/15 disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00c805]/25 text-sm font-black text-[#00c805]">
              QW
            </span>
            <span>
              <span className="block font-semibold text-white">
                Quick wallet
              </span>
              <span className="text-xs text-white/40">
                Deposit address · no popup per trade (Pump-style)
              </span>
            </span>
          </button>
        </div>

        {err && <p className="mt-3 text-xs text-rose-300">{err}</p>}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-white/40 hover:text-white/70"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function useConnectModal() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
    ConnectModal: (props: { title?: string }) => (
      <ConnectModal
        open={open}
        onClose={() => setOpen(false)}
        title={props.title}
      />
    ),
  };
}
