"use client";

import { useState } from "react";
import { relayChainIconUrl } from "@/lib/relay";

export function ChainLogo({
  chainId,
  iconUrl,
  name,
  size = 28,
  className = "",
}: {
  chainId: number;
  iconUrl?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = iconUrl || relayChainIconUrl(chainId);
  const letter = (name || String(chainId))[0]?.toUpperCase() || "?";

  if (failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#0e1116] text-[10px] font-bold text-[#00c805] ring-1 ring-[#2a2f37] ${className}`}
        style={{ width: size, height: size }}
        title={name}
      >
        {letter}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name || `chain ${chainId}`}
      width={size}
      height={size}
      className={`shrink-0 rounded-full bg-[#0e1116] object-cover ring-1 ring-[#2a2f37] ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
