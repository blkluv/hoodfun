import type { Metadata } from "next";
import { TokenBoard } from "@/components/TokenBoard";

export const metadata: Metadata = {
  title: "HoodMemes — Robinhood Chain Trenches",
  description:
    "Trending memecoins on Robinhood Chain. Launch, trade, burn. Live board · hoodmemes.fun",
  openGraph: {
    title: "HoodMemes — Robinhood Chain Trenches",
    description:
      "Trending memecoins on Robinhood Chain. Launch, trade, burn. Live board.",
    url: "https://hoodmemes.fun",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "HoodMemes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HoodMemes — Robinhood Chain Trenches",
    description: "Trending memecoins on Robinhood Chain. Live board.",
    images: ["/og.png"],
  },
};

export default function Home() {
  return <TokenBoard />;
}
