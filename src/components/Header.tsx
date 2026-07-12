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
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f0c]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00c805] text-sm font-black text-black shadow-[0_0_20px_rgba(0,200,5,0.35)]">
              HM
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-white group-hover:text-[#00c805] transition-colors">
                HoodMemes
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                hoodmemes.fun
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              Board
            </Link>
            <Link
              href="/create"
              className="rounded-lg bg-[#00c805] px-3 py-1.5 text-sm font-semibold text-black hover:bg-[#00e006] transition-colors shadow-[0_0_16px_rgba(0,200,5,0.25)]"
            >
              Launch
            </Link>

            {!ready ? (
              <span className="px-2 text-xs text-white/30">…</span>
            ) : isLoggedIn && address ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/account"
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-left transition hover:border-[#00c805]/40"
                >
                  <div className="font-mono text-[11px] text-white/90">
                    {shortAddr(address, 4)}
                  </div>
                  <div className="text-[10px] text-white/40">
                    {ethBalance} ETH · {mode === "session" ? "quick" : "wallet"}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden rounded-lg px-2 py-1.5 text-xs text-white/40 hover:text-white sm:inline"
                >
                  Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConnectOpen(true)}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/5"
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
