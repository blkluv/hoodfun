"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** First-party pageview beacon — no third-party cookies */
export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // Skip admin
    if (pathname.startsWith("/hm-ops") || pathname.startsWith("/api")) return;

    const t = setTimeout(() => {
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "pageview", path: pathname }),
        keepalive: true,
      }).catch(() => null);
    }, 400);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
