import type { Metadata } from "next";
import { TokenBoard } from "@/components/TokenBoard";

const SITE = "https://www.hoodmemes.com";
const OG = `${SITE}/og.png?v=5`;

export const metadata: Metadata = {
  title: "HoodMemes — Robinhood Chain Trenches",
  description:
    "Trending memecoins on Robinhood Chain. Launch, trade, burn. Live board · hoodmemes.com",
  openGraph: {
    title: "HoodMemes — Robinhood Chain Trenches",
    description:
      "Trending memecoins on Robinhood Chain. Launch, trade, burn. Live board.",
    url: SITE,
    siteName: "HoodMemes",
    type: "website",
    images: [
      {
        url: OG,
        secureUrl: OG,
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
    description: "Trending memecoins on Robinhood Chain. Live board.",
    images: [OG],
    creator: "@hoodmemesdotcom",
    site: "@hoodmemesdotcom",
  },
};

export default function Home() {
  return <TokenBoard />;
}
