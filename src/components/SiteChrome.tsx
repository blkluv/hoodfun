"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteConfig } from "@/lib/site-config";

export function AnnouncementBar() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((c: SiteConfig) => {
        setConfig(c);
        try {
          const key = `hm_ann_${c.updatedAt}_${c.announcement?.text?.slice(0, 24)}`;
          if (sessionStorage.getItem(key) === "1") setDismissed(true);
        } catch {
          /* */
        }
      })
      .catch(() => null);
  }, []);

  const ann = config?.announcement;
  if (!ann?.enabled || !ann.text || dismissed) return null;

  const tone =
    ann.tone === "warn"
      ? "border-amber-500/40 bg-amber-500/15 text-amber-50"
      : ann.tone === "success"
        ? "border-[#ccff00]/35 bg-[#ccff00]/12 text-[#d4ffd4]"
        : "border-sky-500/30 bg-sky-500/12 text-sky-50";

  function dismiss() {
    setDismissed(true);
    try {
      if (config) {
        const key = `hm_ann_${config.updatedAt}_${ann!.text.slice(0, 24)}`;
        sessionStorage.setItem(key, "1");
      }
    } catch {
      /* */
    }
  }

  const inner = (
    <span className="text-center text-[12px] font-semibold leading-snug sm:text-sm">
      {ann.text}
    </span>
  );

  return (
    <div className={`border-b ${tone}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:px-4">
        <div className="min-w-0 flex-1">
          {ann.href ? (
            ann.href.startsWith("http") ? (
              <a href={ann.href} target="_blank" rel="noreferrer" className="block hover:underline">
                {inner}
              </a>
            ) : (
              <Link href={ann.href} className="block hover:underline">
                {inner}
              </Link>
            )
          ) : (
            inner
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050806]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-1.5 text-center">
        <Tab href="/" label="Board" />
        <Tab href="/create" label="Launch" primary />
        <Tab href="/account" label="Account" />
        <a
          href="https://x.com/hoodmemesdotfun"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl px-1 py-2 text-[10px] font-bold text-white/45"
        >
          𝕏
        </a>
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-1 py-2 text-[10px] font-bold ${
        primary ? "bg-[#ccff00]/15 text-[#ccff00]" : "text-white/45"
      }`}
    >
      {label}
    </Link>
  );
}
