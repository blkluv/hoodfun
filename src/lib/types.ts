export type TokenSource = "dex" | "hoodfun" | "noxa" | "unknown";

export interface TokenCardData {
  address: string;
  name: string;
  symbol: string;
  pairAddress: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  liquidity: number | null;
  imageUrl: string | null;
  dexscreenerUrl: string | null;
  createdAt: number | null;
  source: TokenSource;
  /** True when launched via HoodFun bonding curve (not just indexed) */
  isNative: boolean;
  txns24h: number | null;
}

export type SortKey = "marketCap" | "volume24h" | "priceChange24h" | "createdAt";
