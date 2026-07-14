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
  const {
    loginWithInjected,
    loginWithSession,
    importQuickWallet,
    resetQuickWallet,
  } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importKey, setImportKey] = useState("");

  if (!open) return null;

  async function mm(forcePicker: boolean) {
    setBusy(true);
    setErr(null);
    try {
      await loginWithInjected({ forcePicker });
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

  function doImport() {
    setErr(null);
    try {
      if (!importKey.trim()) {
        setErr("Paste a private key");
        return;
      }
      importQuickWallet(importKey.trim());
      setImportKey("");
      onClose();
    } catch {
      setErr("Invalid private key");
    }
  }

  function doReset() {
    if (
      !confirm(
        "Create a brand-new quick wallet on this browser? Export the old key first if it has funds."
      )
    )
      return;
    resetQuickWallet();
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
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0d120e] p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/45">
          Switch MetaMask account or import your new private key as a quick
          wallet. Keys never leave this device.
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => mm(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-[#ccff00]/40 hover:bg-white/[0.08] disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20 text-lg">
              🦊
            </span>
            <span>
              <span className="block font-semibold text-white">
                MetaMask · pick account
              </span>
              <span className="text-xs text-white/40">
                Opens the account chooser so you can select your new wallet
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={qw}
            className="flex w-full items-center gap-3 rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/10 px-4 py-3 text-left transition hover:bg-[#ccff00]/15 disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ccff00]/25 text-sm font-black text-[#ccff00]">
              QW
            </span>
            <span>
              <span className="block font-semibold text-white">
                Continue with saved quick wallet
              </span>
              <span className="text-xs text-white/40">
                Reuses the key already stored in this browser
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => setShowImport((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-left transition hover:bg-sky-500/15 disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sm font-black text-sky-200">
              🔑
            </span>
            <span>
              <span className="block font-semibold text-white">
                Import private key
              </span>
              <span className="text-xs text-white/40">
                Paste your own key — only saved in this browser (never uploaded)
              </span>
            </span>
          </button>

          {showImport && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
              <input
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                placeholder="0x… private key"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px] text-white outline-none focus:border-[#ccff00]/40"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={doImport}
                className="w-full rounded-lg bg-[#ccff00] py-2 text-sm font-black text-black"
              >
                Import & log in
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={doReset}
            className="w-full rounded-xl border border-rose-500/25 px-4 py-2.5 text-left text-xs text-rose-200/80 hover:bg-rose-500/10"
          >
            Reset quick wallet (new empty key on this browser)
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
