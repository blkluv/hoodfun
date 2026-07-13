export type TokenSource = "dex" | "hoodfun" | "noxa" | "unknown";

export interface TokenCardData {
  address: string;
  name: string;
  symbol: string;
  pairAddress: string | null;
  priceUsd: number | null;
  priceNative?: number | null;
  marketCap: number | null;
  fdv?: number | null;
  volume24h: number | null;
  volume1h: number | null;
  volume6h: number | null;
  volume5m?: number | null;
  priceChange5m: number | null;
  priceChange1h: number | null;
  priceChange6h: number | null;
  priceChange24h: number | null;
  liquidity: number | null;
  liquidityBase?: number | null;
  liquidityQuote?: number | null;
  imageUrl: string | null;
  dexscreenerUrl: string | null;
  createdAt: number | null;
  source: TokenSource;
  isNative: boolean;
  txns24h: number | null;
  buys24h: number | null;
  sells24h: number | null;
  buys1h?: number | null;
  sells1h?: number | null;
  buys5m?: number | null;
  sells5m?: number | null;
  dexId?: string | null;
  quoteSymbol?: string | null;
  /** Composite score for "trending" */
  trendScore: number;
}

export type BoardTab =
  | "trending"
  | "hot"
  | "new"
  | "gainers"
  | "losers"
  | "volume"
  | "mcap"
  | "liquidity";

export type SortKey =
  | "marketCap"
  | "volume24h"
  | "volume1h"
  | "priceChange24h"
  | "priceChange1h"
  | "createdAt"
  | "liquidity"
  | "trendScore"
  | "txns24h";
