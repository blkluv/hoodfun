"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { ConnectModal } from "./ConnectModal";
import { shortAddr } from "@/lib/format";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { useToast } from "./Toast";

export function Header() {
  const { ready, isLoggedIn, address, ethBalance, mode, logout } = useAuth();
  const [connectOpen, setConnectOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const pathname = usePathname();
  const { push } = useToast();
  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setWalletOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!walletRef.current?.contains(e.target as Node)) setWalletOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const nav = [
    { href: "/", label: "Board" },
    { href: "/create", label: "Launch" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/tokenlist", label: "List" },
  ];

  function navCls(href: string) {
    const active =
      href === "/"
        ? pathname === "/"
        : pathname.startsWith(href);
    return `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "bg-white/10 text-white"
        : "text-white/55 hover:bg-white/5 hover:text-white"
    }`;
  }

  async function copyAddr() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      push("Address copied");
    } catch {
      push("Copy failed", "err");
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050806]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="relative h-9 w-9 overflow-hidden rounded-xl shadow-[0_0_24px_rgba(0,200,5,0.4)] ring-1 ring-[#00c805]/30 transition group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="HoodMemes"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-cover"
                  priority
                />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-black tracking-tight text-white group-hover:text-[#00c805]">
                  HoodMemes
                </div>
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
                  trenches
                </div>
              </div>
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-white/45 sm:inline-flex">
              <span className="hm-live-dot h-1.5 w-1.5 rounded-full bg-[#00c805]" />
              RH · {ROBINHOOD_CHAIN.id}
            </span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={navCls(n.href)}>
                {n.label}
              </Link>
            ))}
            <a
              href="https://x.com/hoodmemesdotfun"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-[#00c805]"
            >
              𝕏
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/create"
              className="rounded-xl bg-[#00c805] px-3 py-1.5 text-sm font-black text-black shadow-[0_0_20px_rgba(0,200,5,0.3)] hover:bg-[#00e006]"
            >
              Launch
            </Link>

            {!ready ? (
              <span className="px-2 text-xs text-white/30">…</span>
            ) : isLoggedIn && address ? (
              <div className="relative" ref={walletRef}>
                <button
                  type="button"
                  onClick={() => setWalletOpen((v) => !v)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-left hover:border-[#00c805]/40"
                >
                  <div className="font-mono text-[11px] font-semibold text-white/90">
                    {shortAddr(address, 4)}
                  </div>
                  <div className="text-[10px] text-white/40">
                    {ethBalance} ETH · {mode === "session" ? "quick" : "wallet"}
                  </div>
                </button>
                {walletOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0a100c] py-1 shadow-2xl">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/5"
                      onClick={copyAddr}
                    >
                      Copy address
                    </button>
                    <a
                      href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-3 py-2 text-xs text-white/70 hover:bg-white/5"
                    >
                      Explorer ↗
                    </a>
                    <Link
                      href="/account"
                      className="block px-3 py-2 text-xs text-white/70 hover:bg-white/5"
                    >
                      Account
                    </Link>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-[#00c805] hover:bg-white/5"
                      onClick={() => {
                        setWalletOpen(false);
                        setConnectOpen(true);
                      }}
                    >
                      Switch wallet…
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-xs text-rose-300 hover:bg-white/5"
                      onClick={() => {
                        logout();
                        setWalletOpen(false);
                      }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConnectOpen(true)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/85 hover:border-[#00c805]/40"
              >
                Log in
              </button>
            )}

            <button
              type="button"
              className="rounded-lg border border-white/10 p-2 text-white/60 md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#050806] px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={navCls(n.href) + " block"}
                >
                  {n.label}
                </Link>
              ))}
              <a
                href="https://x.com/hoodmemesdotfun"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-3 py-1.5 text-sm text-white/55"
              >
                𝕏 @hoodmemesdotfun
              </a>
              <div className="mt-1 text-[10px] text-white/30">
                Robinhood Chain · {ROBINHOOD_CHAIN.id}
              </div>
            </div>
          </div>
        )}
      </header>
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  );
}
