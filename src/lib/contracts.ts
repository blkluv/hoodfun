import { ROBINHOOD_CHAIN } from "./chain";

/**
 * Live HoodFactory on Robinhood Chain (4663).
 * Override with NEXT_PUBLIC_FACTORY_ADDRESS if you redeploy.
 */
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "0xD0F7f28C32e111C2367aB08B289d66Ab3DeFf8Eb") as `0x${string}`;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  ROBINHOOD_CHAIN.rpcUrls.default.http[0];

export function isFactoryConfigured(): boolean {
  return Boolean(FACTORY_ADDRESS && FACTORY_ADDRESS.startsWith("0x") && FACTORY_ADDRESS.length === 42);
}
