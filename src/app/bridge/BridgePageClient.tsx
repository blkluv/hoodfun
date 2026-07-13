"use client";

import { SwapBridgePanel } from "@/components/SwapBridgePanel";

/** Standalone bridge widget — Relay only, polished for /bridge page */
export function BridgePageClient() {
  return (
    <SwapBridgePanel bridgeOnly defaultTab="bridge" compactChrome />
  );
}
