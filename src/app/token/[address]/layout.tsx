import type { Metadata } from "next";
import { resolveTokenIdentity } from "@/lib/token-meta";

const SITE = "https://www.hoodmemes.fun";
const DEFAULT_OG = `${SITE}/og.png?v=3`;

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
    ? `${name ?? symbol} ($${symbol}) on Robinhood Chain — live chart, trade on Uniswap · hoodmemes.fun`
    : `Robinhood Chain token ${address} on HoodMemes trenches`;

  const ogTitle = symbol ? `$${symbol} on HoodMemes` : title;

  // Prefer token logo if absolute URL; else site OG (must be absolute www for X)
  let imageUrl = DEFAULT_OG;
  if (id?.imageUrl) {
    if (id.imageUrl.startsWith("http")) {
      imageUrl = id.imageUrl;
    } else if (id.imageUrl.startsWith("/")) {
      imageUrl = `${SITE}${id.imageUrl}`;
    }
  }

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      siteName: "HoodMemes",
      url: `${SITE}/token/${address}`,
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          width: 1200,
          height: 630,
          alt: ogTitle,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [imageUrl],
      creator: "@hoodmemesdotfun",
      site: "@hoodmemesdotfun",
    },
  };
}

export default function TokenLayout({ children }: Props) {
  return children;
}
