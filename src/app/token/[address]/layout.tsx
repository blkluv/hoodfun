import type { Metadata } from "next";
import { fetchTokenByAddress } from "@/lib/dexscreener";

type Props = { params: Promise<{ address: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const token = await fetchTokenByAddress(address).catch(() => null);
  const symbol = token?.symbol ?? "TOKEN";
  const name = token?.name ?? "Meme token";
  const title = `$${symbol} on HoodMemes`;
  const description = token
    ? `${name} ($${symbol}) on Robinhood Chain — trade on HoodMemes. MCap live · hoodmemes.fun`
    : `${symbol} on Robinhood Chain trenches — hoodmemes.fun`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "HoodMemes",
      url: `https://hoodmemes.fun/token/${address}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function TokenLayout({ children }: Props) {
  return children;
}
