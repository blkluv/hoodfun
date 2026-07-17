"use client";

import { useState } from "react";

export function AirdropClient({ ca }: { ca: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="mx-auto mt-6 flex max-w-full items-center gap-2 rounded-2xl border border-black/15 bg-black/10 px-4 py-2.5 font-mono text-[11px] font-semibold text-black/70 transition hover:bg-black/15 sm:text-xs"
    >
      <span className="truncate">{ca}</span>
      <span className="shrink-0 rounded-lg bg-black px-2 py-0.5 text-[10px] font-black text-[#ccff00]">
        {copied ? "Copied" : "Copy CA"}
      </span>
    </button>
  );
}
