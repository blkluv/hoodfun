import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
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

export const metadata: Metadata = {
  title: {
    default: "HoodMemes — Robinhood Chain launchpad",
    template: "%s · HoodMemes",
  },
  description: siteDescription,
  metadataBase: new URL("https://hoodmemes.fun"),
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
    url: "https://hoodmemes.fun",
    siteName: "HoodMemes",
    title: "HoodMemes — Robinhood Chain Trenches",
    description: siteDescription,
    images: [
      {
        url: "/og.png",
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
    images: ["/og.png"],
    creator: "@hoodmemesdotfun",
    site: "@hoodmemesdotfun",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const build = getBuildInfo();
  const builtLabel = build.builtAt
    ? new Date(build.builtAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-0 sm:py-2">
            {children}
          </main>
          <footer className="border-t border-white/5 py-8 text-center text-[11px] text-white/25">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://hoodmemes.fun"
                className="font-semibold text-white/50 hover:text-[#00c805]"
              >
                hoodmemes.fun
              </a>
              <a
                href="https://x.com/hoodmemesdotfun"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-white/50 hover:text-[#00c805]"
              >
                𝕏 @hoodmemesdotfun
              </a>
            </div>
            <div className="mt-2">
              Independent · not affiliated with Robinhood Markets, Inc. · Not
              financial advice · DYOR
            </div>
            {/* Deploy fingerprint — hard-refresh if this doesn’t match latest push */}
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
        </Providers>
      </body>
    </html>
  );
}
