"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { ConnectModal } from "./ConnectModal";
import { shortAddr } from "@/lib/format";

export function Header() {
  const { ready, isLoggedIn, address, ethBalance, mode, logout } = useAuth();
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050806]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#00c805] text-sm font-black text-black shadow-[0_0_24px_rgba(0,200,5,0.45)] transition group-hover:scale-105">
              HM
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-white hm-live-dot" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-black tracking-tight text-white group-hover:text-[#00c805] transition-colors">
                HoodMemes
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
                trenches
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white sm:inline"
            >
              Board
            </Link>
            <Link
              href="/create"
              className="rounded-xl bg-[#00c805] px-3.5 py-1.5 text-sm font-black text-black shadow-[0_0_20px_rgba(0,200,5,0.3)] transition hover:bg-[#00e006]"
            >
              Launch
            </Link>

            {!ready ? (
              <span className="px-2 text-xs text-white/30">…</span>
            ) : isLoggedIn && address ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/account"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-left transition hover:border-[#00c805]/40"
                >
                  <div className="font-mono text-[11px] font-semibold text-white/90">
                    {shortAddr(address, 4)}
                  </div>
                  <div className="text-[10px] text-white/40">
                    {ethBalance} ETH · {mode === "session" ? "quick" : "wallet"}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden rounded-lg px-2 py-1.5 text-xs text-white/35 hover:text-white sm:inline"
                >
                  Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConnectOpen(true)}
                className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-white/85 transition hover:border-[#00c805]/40 hover:text-white"
              >
                Log in
              </button>
            )}
          </nav>
        </div>
      </header>
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  );
}
