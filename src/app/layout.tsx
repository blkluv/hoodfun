import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HoodMemes — Robinhood Chain launchpad",
  description:
    "Pump-style memecoin board for Robinhood Chain. Browse live tokens, launch with bonding curves, trade the trenches. hoodmemes.fun",
  metadataBase: new URL("https://hoodmemes.fun"),
  openGraph: {
    title: "HoodMemes",
    description: "The trenches on Robinhood Chain",
    url: "https://hoodmemes.fun",
    siteName: "HoodMemes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <div className="font-semibold text-white/40">hoodmemes.fun</div>
            <div className="mt-1">
              Independent · not affiliated with Robinhood Markets, Inc. · Not
              financial advice · DYOR
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
