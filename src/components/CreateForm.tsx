"use client";

import { useState } from "react";
import { ROBINHOOD_CHAIN } from "@/lib/chain";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00c805]/45 focus:ring-1 focus:ring-[#00c805]/25";

export function CreateForm() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [desc, setDesc] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onImage(file: File | null) {
    if (!file) {
      setImagePreview(null);
      return;
    }
    setImagePreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 600));
    setMsg(
      `Launch pipeline ready for $${symbol || "TICKER"} on chain ${ROBINHOOD_CHAIN.id}. Bonding-curve factory deploy is next — create is gated until anti-spam (paid mint) is live.`
    );
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5">
      <div className="rounded-2xl border border-[#00c805]/25 bg-[#00c805]/5 px-4 py-3 text-sm text-[#b8f5b8]">
        <strong className="text-[#00c805]">Anti-spam by design.</strong> Paid
        create + bonding curve (no free Uni spam dump). Existing RH tokens are
        already on the board while NOXA create is paused.
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-white/45">
            Name
          </span>
          <input
            required
            maxLength={32}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cash Cat"
            className={inputCls}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-white/45">
            Ticker
          </span>
          <input
            required
            maxLength={12}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="CASHCAT"
            className={`${inputCls} uppercase`}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-white/45">
            Description (optional)
          </span>
          <textarea
            maxLength={280}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="why this coin exists"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-white/45">
            Image
          </span>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/20 px-6 py-4 text-xs text-white/50 hover:border-[#00c805]/40 hover:text-white/70">
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
                alt="preview"
                className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/10"
              />
            )}
          </div>
        </div>

        <div className="rounded-xl bg-black/30 px-3 py-2 font-mono text-[11px] text-white/40">
          Network: {ROBINHOOD_CHAIN.name} · chainId {ROBINHOOD_CHAIN.id} · gas
          ETH
        </div>

        <button
          type="submit"
          disabled={busy || !name || !symbol}
          className="w-full rounded-xl bg-[#00c805] py-3 text-sm font-bold text-black transition hover:bg-[#00e006] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Preparing…" : "Launch coin (coming online)"}
        </button>

        {msg && (
          <p className="text-sm leading-relaxed text-white/60">{msg}</p>
        )}
      </div>
    </form>
  );
}
