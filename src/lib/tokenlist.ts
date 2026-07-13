/**
 * Uniswap Token Lists standard — HoodMemes curated launches.
 * https://github.com/Uniswap/token-lists
 */

import { ROBINHOOD_CHAIN } from "./chain";
import { getAllLaunchMeta, type LaunchMeta } from "./launch-meta";
import { logoPublicUrl } from "./logo-store";

const SITE = "https://www.hoodmemes.fun";

export type TokenListToken = {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  extensions?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    description?: string;
    pair?: string;
    hoodmemes?: string;
  };
};

export type HoodTokenList = {
  name: string;
  logoURI: string;
  keywords: string[];
  tags: Record<string, { name: string; description: string }>;
  timestamp: string;
  version: { major: number; minor: number; patch: number };
  tokens: TokenListToken[];
};

function absLogo(meta: LaunchMeta): string | undefined {
  if (meta.imageUrl) {
    if (meta.imageUrl.startsWith("http")) return meta.imageUrl;
    if (meta.imageUrl.startsWith("/")) return `${SITE}${meta.imageUrl}`;
  }
  // Prefer our hosted logo API if we might have one
  return `${SITE}${logoPublicUrl(meta.token)}`;
}

export async function buildHoodTokenList(): Promise<HoodTokenList> {
  const map = await getAllLaunchMeta();
  const list = Object.values(map)
    .filter((m) => m.token && m.symbol && m.name)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const tokens: TokenListToken[] = list.map((m) => {
    const address =
      m.token.startsWith("0x") && m.token.length === 42
        ? // checksum-style lower for list consumers that normalize
          m.token.toLowerCase()
        : m.token.toLowerCase();

    const logoURI = absLogo(m);
    const extensions: TokenListToken["extensions"] = {
      hoodmemes: `${SITE}/token/${address}`,
    };
    if (m.website) extensions.website = m.website;
    if (m.twitter) extensions.twitter = m.twitter;
    if (m.telegram) extensions.telegram = m.telegram;
    if (m.description) extensions.description = m.description;
    if (m.pair) extensions.pair = m.pair;

    return {
      chainId: ROBINHOOD_CHAIN.id,
      address,
      name: m.name.slice(0, 64),
      symbol: m.symbol.slice(0, 16).toUpperCase(),
      decimals: 18,
      ...(logoURI ? { logoURI } : {}),
      extensions,
    };
  });

  // Version: bump patch with token count so lists revalidate cleanly
  const patch = tokens.length;
  const timestamp = new Date().toISOString();

  return {
    name: "HoodMemes",
    logoURI: `${SITE}/logo.png`,
    keywords: [
      "hoodmemes",
      "robinhood",
      "memecoin",
      "launchpad",
      "4663",
    ],
    tags: {
      hoodmemes: {
        name: "HoodMemes",
        description: "Launched via hoodmemes.fun on Robinhood Chain",
      },
    },
    timestamp,
    version: {
      major: 1,
      minor: 0,
      patch,
    },
    tokens,
  };
}
