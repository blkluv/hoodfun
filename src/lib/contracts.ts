import { ROBINHOOD_CHAIN } from "./chain";

/**
 * Set after deploy: NEXT_PUBLIC_FACTORY_ADDRESS=0x...
 * Until set, create/trade on curve is UI-ready but will show "factory not deployed".
 */
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "") as `0x${string}` | "";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  ROBINHOOD_CHAIN.rpcUrls.default.http[0];

export function isFactoryConfigured(): boolean {
  return Boolean(FACTORY_ADDRESS && FACTORY_ADDRESS.startsWith("0x") && FACTORY_ADDRESS.length === 42);
}
