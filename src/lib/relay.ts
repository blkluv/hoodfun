/**
 * Relay.link API helpers — bridge ETH (and more) onto Robinhood Chain (4663).
 * Docs: https://docs.relay.link
 */

import type { Address, Hex } from "viem";

export const RELAY_API = "https://api.relay.link";
export const RELAY_ZERO =
  "0x0000000000000000000000000000000000000000" as const;

/** Popular source chains for onboarding to RH */
export const RELAY_FROM_CHAINS = [
  { id: 1, name: "Ethereum", short: "ETH" },
  { id: 8453, name: "Base", short: "Base" },
  { id: 42161, name: "Arbitrum", short: "Arb" },
  { id: 10, name: "Optimism", short: "OP" },
] as const;

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
