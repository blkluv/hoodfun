import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f0c]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00c805] text-sm font-black text-black shadow-[0_0_20px_rgba(0,200,5,0.35)]">
            HF
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-white group-hover:text-[#00c805] transition-colors">
              HoodFun
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">
              Robinhood Chain
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
          <a
            href="https://dexscreener.com/robinhood"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline rounded-lg px-3 py-1.5 text-sm text-white/50 hover:text-white transition-colors"
          >
            Charts ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
