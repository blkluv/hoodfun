/**
 * Server-side token identity for metadata + SSR.
 * Merges DexScreener, pair query, factory launch, and on-chain ERC20.
 */

import {
  createPublicClient,
  http,
  type Address,
} from "viem";
import { ROBINHOOD_CHAIN } from "./chain";
import { factoryAbi, erc20Abi } from "./abis";
import { FACTORY_ADDRESS, isFactoryConfigured } from "./contracts";
import { fetchTokenByAddress, fetchTokenByPair } from "./dexscreener";
import { getLaunchMeta } from "./launch-meta";
import type { TokenCardData } from "./types";

const chain = {
  id: ROBINHOOD_CHAIN.id,
  name: ROBINHOOD_CHAIN.name,
  nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [...ROBINHOOD_CHAIN.rpcUrls.default.http] },
  },
} as const;

export type TokenIdentity = {
  symbol: string;
  name: string;
  pair: string | null;
  imageUrl: string | null;
  dexToken: TokenCardData | null;
  creator: string | null;
  description: string | null;
};

export async function resolveTokenIdentity(
  address: string,
  pairHint?: string | null
): Promise<TokenIdentity> {
  const addr = address as Address;

  let dexToken =
    (await fetchTokenByAddress(addr).catch(() => null)) ||
    (pairHint
      ? await fetchTokenByPair(pairHint).catch(() => null)
      : null);

  // If pair returned wrong base, ignore
  if (
    dexToken &&
    dexToken.address.toLowerCase() !== addr.toLowerCase()
  ) {
    // still use symbol if pair is for this token as base — pairToToken uses baseToken
    // keep it
  }

  let onchainName: string | null = null;
  let onchainSymbol: string | null = null;
  let factoryCreator: string | null = null;
  let factoryPair: string | null = null;

  try {
    const pc = createPublicClient({
      chain,
      transport: http(ROBINHOOD_CHAIN.rpcUrls.default.http[0]),
    });
    const [name, symbol] = await Promise.all([
      pc
        .readContract({
          address: addr,
          abi: erc20Abi,
          functionName: "name",
        })
        .catch(() => null) as Promise<string | null>,
      pc
        .readContract({
          address: addr,
          abi: erc20Abi,
          functionName: "symbol",
        })
        .catch(() => null) as Promise<string | null>,
    ]);
    onchainName = name;
    onchainSymbol = symbol;

    if (isFactoryConfigured()) {
      try {
        const pair = (await pc.readContract({
          address: FACTORY_ADDRESS as Address,
          abi: factoryAbi,
          functionName: "pairOfToken",
          args: [addr],
        })) as Address;
        const zero = "0x0000000000000000000000000000000000000000";
        if (pair && pair !== zero) {
          factoryPair = pair;
          const launch = await pc.readContract({
            address: FACTORY_ADDRESS as Address,
            abi: factoryAbi,
            functionName: "launches",
            args: [addr],
          });
          factoryCreator = launch[2] as string;
          if (!dexToken) {
            dexToken = await fetchTokenByPair(pair).catch(() => null);
          }
        }
      } catch {
        /* not on this factory */
      }
    }
  } catch {
    /* rpc soft-fail */
  }

  const meta = await getLaunchMeta(addr).catch(() => null);

  const symbol =
    (dexToken?.symbol && dexToken.symbol !== "TOKEN"
      ? dexToken.symbol
      : null) ||
    onchainSymbol ||
    meta?.symbol ||
    "TOKEN";

  const name =
    (dexToken?.name && dexToken.name !== "Token" ? dexToken.name : null) ||
    onchainName ||
    meta?.name ||
    symbol;

  return {
    symbol: symbol.toUpperCase(),
    name,
    pair: pairHint || factoryPair || dexToken?.pairAddress || null,
    imageUrl: dexToken?.imageUrl ?? null,
    dexToken,
    creator: factoryCreator || meta?.creator || null,
    description: meta?.description ?? null,
  };
}
