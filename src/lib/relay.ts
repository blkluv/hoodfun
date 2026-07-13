/**
 * Relay.link API helpers — bridge ETH (and more) onto Robinhood Chain (4663).
 * Docs: https://docs.relay.link
 */

import type { Address, Hex } from "viem";

export const RELAY_API = "https://api.relay.link";
export const RELAY_ZERO =
  "0x0000000000000000000000000000000000000000" as const;

/** Popular sources pinned to the top of the from-chain list */
export const RELAY_POPULAR_FROM_IDS = [1, 8453, 42161, 10, 137, 56, 43114] as const;

/** Fallback if Relay chains API is unreachable */
export const RELAY_FROM_CHAINS_FALLBACK: RelayOriginChain[] = [
  { id: 1, name: "Ethereum", short: "ETH" },
  { id: 8453, name: "Base", short: "Base" },
  { id: 42161, name: "Arbitrum", short: "Arb" },
  { id: 10, name: "Optimism", short: "OP" },
  { id: 137, name: "Polygon", short: "Polygon" },
  { id: 56, name: "BNB", short: "BNB" },
  { id: 43114, name: "Avalanche", short: "AVAX" },
];

/** @deprecated use RELAY_FROM_CHAINS_FALLBACK or fetchRelayOriginChains() */
export const RELAY_FROM_CHAINS = RELAY_FROM_CHAINS_FALLBACK;

export type RelayOriginChain = {
  id: number;
  name: string;
  short: string;
  rpcUrl?: string;
  depositEnabled?: boolean;
};

/**
 * All Relay EVM chains that can deposit ETH → Robinhood (4663).
 * Live from https://api.relay.link/chains
 */
export async function fetchRelayOriginChains(): Promise<RelayOriginChain[]> {
  try {
    const res = await fetch(`${RELAY_API}/chains`, { cache: "no-store" });
    if (!res.ok) throw new Error(`chains ${res.status}`);
    const data = (await res.json()) as {
      chains?: Array<{
        id?: number;
        name?: string;
        displayName?: string;
        disabled?: boolean;
        depositEnabled?: boolean;
        vmType?: string;
        httpRpcUrl?: string;
        currency?: { supportsBridging?: boolean; symbol?: string };
      }>;
    };
    const list = data.chains || [];
    const out: RelayOriginChain[] = [];

    for (const c of list) {
      const id = Number(c.id);
      if (!Number.isFinite(id) || id === 4663) continue; // not RH itself
      if (c.disabled) continue;
      if (c.depositEnabled != null && !c.depositEnabled) continue;
      if (c.vmType && c.vmType !== "evm") continue;
      // Need native ETH-style bridging support when possible
      if (c.currency?.supportsBridging === false) continue;

      const name = c.displayName || c.name || `Chain ${id}`;
      out.push({
        id,
        name,
        short: name.length > 14 ? name.slice(0, 12) + "…" : name,
        rpcUrl: c.httpRpcUrl,
        depositEnabled: c.depositEnabled !== false,
      });
    }

    // Popular first, then A–Z
    const popular = new Set<number>(RELAY_POPULAR_FROM_IDS as unknown as number[]);
    out.sort((a, b) => {
      const ap = popular.has(a.id) ? 0 : 1;
      const bp = popular.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      if (ap === 0) {
        return (
          (RELAY_POPULAR_FROM_IDS as readonly number[]).indexOf(a.id) -
          (RELAY_POPULAR_FROM_IDS as readonly number[]).indexOf(b.id)
        );
      }
      return a.name.localeCompare(b.name);
    });

    return out.length ? out : RELAY_FROM_CHAINS_FALLBACK;
  } catch {
    return RELAY_FROM_CHAINS_FALLBACK;
  }
}

export type RelayQuoteStepItem = {
  status?: string;
  data?: {
    from?: string;
    to?: string;
    data?: string;
    value?: string;
    chainId?: number;
    gas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
  check?: { endpoint?: string; method?: string };
};

export type RelayQuoteStep = {
  id?: string;
  action?: string;
  description?: string;
  kind?: string;
  requestId?: string;
  items?: RelayQuoteStepItem[];
};

export type RelayQuote = {
  steps?: RelayQuoteStep[];
  fees?: {
    gas?: { amount?: string; amountUsd?: string };
    relayer?: { amount?: string; amountUsd?: string };
  };
  details?: {
    operation?: string;
    timeEstimate?: number;
    currencyIn?: { amount?: string; currency?: { symbol?: string; decimals?: number } };
    currencyOut?: { amount?: string; currency?: { symbol?: string; decimals?: number } };
    totalImpact?: { usd?: string; percent?: string };
    rate?: string;
  };
  message?: string;
  error?: string;
};

export function relayBridgeUrl(opts: {
  toAddress: string;
  amountEth?: string;
  fromChainId?: number;
}): string {
  const params = new URLSearchParams();
  params.set("toAddress", opts.toAddress);
  if (opts.amountEth) params.set("amount", opts.amountEth);
  if (opts.fromChainId) params.set("fromChainId", String(opts.fromChainId));
  return `https://relay.link/bridge/robinhood?${params.toString()}`;
}

export async function getRelayBridgeQuote(params: {
  user: Address;
  originChainId: number;
  amountWei: string;
  recipient?: Address;
}): Promise<RelayQuote> {
  const body = {
    user: params.user,
    originChainId: params.originChainId,
    destinationChainId: 4663,
    originCurrency: RELAY_ZERO,
    destinationCurrency: RELAY_ZERO,
    amount: params.amountWei,
    tradeType: "EXACT_INPUT",
    recipient: params.recipient || params.user,
  };

  const res = await fetch(`${RELAY_API}/quote/v2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as RelayQuote;
  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message ||
        data.message ||
        `Relay quote failed (${res.status})`
    );
  }
  return data;
}

export async function getRelayStatus(requestId: string): Promise<{
  status?: string;
  inTxHashes?: string[];
  txHashes?: string[];
  originChainId?: number;
  destinationChainId?: number;
}> {
  const res = await fetch(
    `${RELAY_API}/intents/status/v3?requestId=${encodeURIComponent(requestId)}`
  );
  return res.json();
}

export function extractRelayRequestId(quote: RelayQuote): string | null {
  for (const step of quote.steps || []) {
    if (step.requestId) return step.requestId;
    for (const item of step.items || []) {
      const ep = item.check?.endpoint;
      if (ep) {
        const m = ep.match(/requestId=([^&]+)/);
        if (m) return m[1];
      }
    }
  }
  return null;
}

export type RelayTxData = {
  to: Address;
  data: Hex;
  value: bigint;
  chainId: number;
};

export function extractRelayTransactions(quote: RelayQuote): RelayTxData[] {
  const out: RelayTxData[] = [];
  for (const step of quote.steps || []) {
    if (step.kind && step.kind !== "transaction") continue;
    for (const item of step.items || []) {
      const d = item.data;
      if (!d?.to || d.chainId == null) continue;
      out.push({
        to: d.to as Address,
        data: (d.data || "0x") as Hex,
        value: BigInt(d.value || "0"),
        chainId: Number(d.chainId),
      });
    }
  }
  return out;
}
