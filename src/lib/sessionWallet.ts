"use client";

/**
 * Pump-style quick wallet: browser keypair for one-click trades (no MetaMask popup).
 * User deposits ETH to the address, then buy/sell are signed locally.
 *
 * Security: private key lives in localStorage. Export/backup is the user's job.
 * This matches degen launchpad UX — not a bank.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type Account,
  type WalletClient,
  type PublicClient,
  type Hex,
  type Chain,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { ROBINHOOD_CHAIN } from "./chain";

const STORAGE_KEY = "hoodmemes_quick_wallet_v1";

export const robinhoodChain: Chain = {
  id: ROBINHOOD_CHAIN.id,
  name: ROBINHOOD_CHAIN.name,
  nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [...ROBINHOOD_CHAIN.rpcUrls.default.http] },
    public: { http: [...ROBINHOOD_CHAIN.rpcUrls.public.http] },
  },
  blockExplorers: {
    default: {
      name: ROBINHOOD_CHAIN.blockExplorers.default.name,
      url: ROBINHOOD_CHAIN.blockExplorers.default.url,
    },
  },
};

type StoredWallet = {
  privateKey: Hex;
  address: string;
  createdAt: number;
};

function readStored(): StoredWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredWallet;
  } catch {
    return null;
  }
}

function writeStored(w: StoredWallet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}

export function getOrCreateSessionWallet(): {
  account: Account;
  privateKey: Hex;
  isNew: boolean;
} {
  const existing = readStored();
  if (existing?.privateKey) {
    const account = privateKeyToAccount(existing.privateKey);
    return { account, privateKey: existing.privateKey, isNew: false };
  }
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  writeStored({
    privateKey,
    address: account.address,
    createdAt: Date.now(),
  });
  return { account, privateKey, isNew: true };
}

export function importSessionWallet(privateKey: Hex): Account {
  const key = (
    privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
  ) as Hex;
  const account = privateKeyToAccount(key);
  writeStored({
    privateKey: key,
    address: account.address,
    createdAt: Date.now(),
  });
  return account;
}

export function exportSessionPrivateKey(): Hex | null {
  return readStored()?.privateKey ?? null;
}

export function clearSessionWallet() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: robinhoodChain,
    transport: http(ROBINHOOD_CHAIN.rpcUrls.default.http[0]),
  });
}

export function getSessionWalletClient(): {
  account: Account;
  walletClient: WalletClient;
  publicClient: PublicClient;
} {
  const { account } = getOrCreateSessionWallet();
  const publicClient = getPublicClient();
  const walletClient = createWalletClient({
    account,
    chain: robinhoodChain,
    transport: http(ROBINHOOD_CHAIN.rpcUrls.default.http[0]),
  });
  return { account, walletClient, publicClient };
}

export async function getSessionEthBalance(): Promise<bigint> {
  const { account, publicClient } = getSessionWalletClient();
  return publicClient.getBalance({ address: account.address });
}
