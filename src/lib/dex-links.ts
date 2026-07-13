import { DEXSCREENER_CHAIN } from "./chain";

/** Enhanced Token Info (paid) — logo, socials, description on DexScreener */
export const DEX_TOKEN_INFO_URL =
  "https://marketplace.dexscreener.com/product/token-info";

export const DEX_TOKEN_INFO_ORDER_URL =
  "https://marketplace.dexscreener.com/product/token-info/order";

export function dexscreenerPairUrl(pair: string): string {
  return `https://dexscreener.com/${DEXSCREENER_CHAIN}/${pair}`;
}

export function dexscreenerTokenUrl(token: string): string {
  return `https://dexscreener.com/${DEXSCREENER_CHAIN}/${token}`;
}

export function fomoTokenUrl(token: string): string {
  return `https://fomo.family/tokens/robinhood/${token.toLowerCase()}`;
}

export function uniswapV3PoolUrl(pool: string): string {
  return `https://app.uniswap.org/explore/pools/robinhood/${pool}`;
}

/**
 * Deep link helpers for post-launch "legit stack".
 * Dex has no free write API — paid Token Info is the official path for logo/socials.
 */
export function dexTokenInfoLinks(opts: {
  token: string;
  pair?: string | null;
  symbol?: string;
}) {
  const pairUrl = opts.pair ? dexscreenerPairUrl(opts.pair) : null;
  const tokenUrl = dexscreenerTokenUrl(opts.token);
  return {
    marketplace: DEX_TOKEN_INFO_URL,
    order: DEX_TOKEN_INFO_ORDER_URL,
    pairUrl,
    tokenUrl,
    /** Pre-filled guidance for the paid form */
    formHints: {
      chain: "Robinhood / robinhood",
      chainId: 4663,
      tokenAddress: opts.token,
      symbol: opts.symbol,
      pair: opts.pair || undefined,
    },
  };
}
