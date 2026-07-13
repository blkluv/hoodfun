import { ROBINHOOD_CHAIN } from "./chain";

/**
 * Live HoodInstantFactory on Robinhood Chain (4663).
 * Deployed 2026-07-13 — NOXA-style instant Uniswap launch.
 * Override with NEXT_PUBLIC_FACTORY_ADDRESS if you redeploy.
 *
 * Legacy curve factory (v1): 0xD0F7f28C32e111C2367aB08B289d66Ab3DeFf8Eb
 */
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "0x2C8D3F42e440068C032eAa8d9695c98e7d642820") as `0x${string}`;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  ROBINHOOD_CHAIN.rpcUrls.default.http[0];

export function isFactoryConfigured(): boolean {
  return Boolean(FACTORY_ADDRESS && FACTORY_ADDRESS.startsWith("0x") && FACTORY_ADDRESS.length === 42);
}
