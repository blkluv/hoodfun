import type { Metadata } from "next";
import { resolveTokenIdentity } from "@/lib/token-meta";

const SITE = "https://www.hoodmemes.com";
/** Static brand OG — X crawler is unreliable with slow dynamic ImageResponse routes */
const OG_IMAGE = `${SITE}/og.png?v=5`;

type Props = {
  params: Promise<{ address: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const id = await resolveTokenIdentity(address).catch(() => null);

  const symbol = id?.symbol && id.symbol !== "TOKEN" ? id.symbol : null;
  const name = id?.name && id.name !== "Meme token" ? id.name : null;

  const title = symbol
    ? `$${symbol}${name && name !== symbol ? ` · ${name}` : ""} | HoodMemes`
    : `Token ${address.slice(0, 6)}… | HoodMemes`;

  const description = symbol
    ? `${name ?? symbol} ($${symbol}) on Robinhood Chain — live chart, trade on Uniswap · hoodmemes.com`
    : `Robinhood Chain token ${address} on HoodMemes trenches`;

  const ogTitle = symbol ? `$${symbol} on HoodMemes` : title;

  return {
    title: { absolute: title },
    description,
    metadataBase: new URL(SITE),
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      siteName: "HoodMemes",
      url: `${SITE}/token/${address}`,
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
      title: ogTitle,
      description,
      images: [OG_IMAGE],
      creator: "@hoodmemesdotcom",
      site: "@hoodmemesdotcom",
    },
  };
}

export default function TokenLayout({ children }: Props) {
  return children;
}
