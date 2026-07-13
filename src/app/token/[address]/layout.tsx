import type { Metadata } from "next";
import { resolveTokenIdentity } from "@/lib/token-meta";

type Props = {
  params: Promise<{ address: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const id = await resolveTokenIdentity(address).catch(() => null);

  const symbol = id?.symbol && id.symbol !== "TOKEN" ? id.symbol : null;
  const name = id?.name && id.name !== "Meme token" ? id.name : null;

  // Absolute title — avoid template "$Token · HoodMemes"
  const title = symbol
    ? `$${symbol}${name && name !== symbol ? ` · ${name}` : ""} | HoodMemes`
    : `Token ${address.slice(0, 6)}… | HoodMemes`;

  const description = symbol
    ? `${name ?? symbol} ($${symbol}) on Robinhood Chain — live chart, trade on Uniswap · hoodmemes.fun`
    : `Robinhood Chain token ${address} on HoodMemes trenches`;

  const ogTitle = symbol ? `$${symbol} on HoodMemes` : title;

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      siteName: "HoodMemes",
      url: `https://hoodmemes.fun/token/${address}`,
      ...(id?.imageUrl
        ? { images: [{ url: id.imageUrl, alt: `$${symbol}` }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      ...(id?.imageUrl ? { images: [id.imageUrl] } : {}),
    },
  };
}

export default function TokenLayout({ children }: Props) {
  return children;
}
