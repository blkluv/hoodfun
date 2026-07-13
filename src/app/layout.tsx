import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { AnnouncementBar, MobileBottomNav } from "@/components/SiteChrome";
import { getBuildInfo } from "@/lib/build-info";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "Pump-style memecoin board for Robinhood Chain. Launch, trade, and burn in the trenches. hoodmemes.fun";

/** Canonical host = www (apex 308s to www; X crawler fails image redirects) */
const SITE_URL = "https://www.hoodmemes.fun";
/** Absolute OG URL — no redirect chain for Twitter/X */
const OG_IMAGE = `${SITE_URL}/og.png?v=4`;

export const metadata: Metadata = {
  title: {
    default: "HoodMemes — Robinhood Chain launchpad",
    template: "%s · HoodMemes",
  },
  description: siteDescription,
  metadataBase: new URL(SITE_URL),
  applicationName: "HoodMemes",
  keywords: [
    "HoodMemes",
    "Robinhood Chain",
    "memecoin",
    "launchpad",
    "pump",
    "4663",
  ],
  authors: [{ name: "HoodMemes" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "HoodMemes",
    title: "HoodMemes — Robinhood Chain Trenches",
    description: siteDescription,
    images: [
      {
        url: OG_IMAGE,
        secureUrl: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "HoodMemes — Robinhood Chain Trenches",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HoodMemes — Robinhood Chain Trenches",
    description: siteDescription,
    images: [OG_IMAGE],
    creator: "@hoodmemesdotfun",
    site: "@hoodmemesdotfun",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const build = getBuildInfo();
  const builtLabel = build.builtAt
    ? new Date(build.builtAt).toISOString().replace("T", " ").slice(0, 16) +
      " UTC"
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <Header />
          <AnnouncementBar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-0 sm:py-2 md:pb-2">
            {children}
          </main>
          <footer className="border-t border-white/5 py-10 text-center text-[11px] text-white/30">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link href="/" className="font-semibold text-white/55 hover:text-[#00c805]">
                Board
              </Link>
              <Link href="/create" className="font-semibold text-white/55 hover:text-[#00c805]">
                Launch
              </Link>
              <Link
                href="/how-it-works"
                className="font-semibold text-white/55 hover:text-[#00c805]"
              >
                How it works
              </Link>
              <Link
                href="/tokenlist"
                className="font-semibold text-white/55 hover:text-[#00c805]"
              >
                Token list
              </Link>
              <Link
                href="/disclaimer"
                className="font-semibold text-white/55 hover:text-[#00c805]"
              >
                Disclaimer
              </Link>
              <a
                href="https://x.com/hoodmemesdotfun"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-white/55 hover:text-[#00c805]"
              >
                𝕏 @hoodmemesdotfun
              </a>
            </div>
            <div className="mt-3 text-white/25">
              Independent · not affiliated with Robinhood Markets, Inc. · Not
              financial advice · DYOR
            </div>
            <div
              className="mx-auto mt-4 max-w-xl font-mono text-[10px] leading-relaxed text-white/30"
              title={`Factory ${build.factory}${builtLabel ? ` · built ${builtLabel}` : ""}`}
            >
              <span className="text-white/45">{build.label}</span>
              <span className="mx-1.5 text-white/15">·</span>
              <span>factory {build.factoryShort}</span>
              {builtLabel && (
                <>
                  <span className="mx-1.5 text-white/15">·</span>
                  <span>{builtLabel}</span>
                </>
              )}
            </div>
          </footer>
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
