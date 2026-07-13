"use client";

import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type Account,
  type Address,
  type Hex,
  type WalletClient,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodChain, getOrCreateSessionWallet } from "./sessionWallet";
import { ROBINHOOD_CHAIN } from "./chain";

export type ActiveWalletMode = "session" | "external";

export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: robinhoodChain,
    transport: http(ROBINHOOD_CHAIN.rpcUrls.default.http[0]),
  });
}

export async function ensureRobinhoodChain(
  ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
): Promise<void> {
  const chainIdHex = `0x${ROBINHOOD_CHAIN.id.toString(16)}`;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (e) {
    const err = e as { code?: number };
    if (err?.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: ROBINHOOD_CHAIN.name,
            nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
            rpcUrls: [...ROBINHOOD_CHAIN.rpcUrls.default.http],
            blockExplorerUrls: [ROBINHOOD_CHAIN.blockExplorers.default.url],
          },
        ],
      });
    } else {
      throw e;
    }
  }
}

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthProvider | undefined {
  return (window as unknown as { ethereum?: EthProvider }).ethereum;
}

/**
 * Connect browser wallet. `forcePicker` re-opens the account chooser so you
 * can switch away from a previously connected account.
 */
export async function connectInjectedWallet(
  opts?: { forcePicker?: boolean }
): Promise<Address> {
  const eth = getEthereum();
  if (!eth) {
    throw new Error("No browser wallet found. Install MetaMask, Rabby, or similar.");
  }

  // Force MetaMask account picker (logout alone does not change selected account)
  if (opts?.forcePicker) {
    try {
      await eth.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      /* user rejected or wallet doesn't support — fall through to requestAccounts */
    }
  }

  const accounts = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts?.[0]) throw new Error("No account returned");
  await ensureRobinhoodChain(eth);
  return accounts[0] as Address;
}

export function getInjectedProvider(): EthProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return getEthereum();
}

export function getExternalWalletClient(address: Address): WalletClient {
  const eth = (
    window as unknown as {
      ethereum?: Parameters<typeof custom>[0];
    }
  ).ethereum;
  if (!eth) throw new Error("Wallet disconnected");
  return createWalletClient({
    account: address,
    chain: robinhoodChain,
    transport: custom(eth),
  });
}

export function getSessionClients(): {
  account: Account;
  walletClient: WalletClient;
  publicClient: PublicClient;
} {
  const { account, privateKey } = getOrCreateSessionWallet();
  const acc = privateKeyToAccount(privateKey);
  const publicClient = getPublicClient();
  const walletClient = createWalletClient({
    account: acc,
    chain: robinhoodChain,
    transport: http(ROBINHOOD_CHAIN.rpcUrls.default.http[0]),
  });
  return { account: acc, walletClient, publicClient };
}

export async function getActiveClients(mode: ActiveWalletMode, externalAddress?: Address | null) {
  const publicClient = getPublicClient();
  if (mode === "external") {
    if (!externalAddress) throw new Error("Connect a wallet first");
    const walletClient = getExternalWalletClient(externalAddress);
    return {
      address: externalAddress,
      account: externalAddress as unknown as Account,
      walletClient,
      publicClient,
      mode: "external" as const,
    };
  }
  const s = getSessionClients();
  return {
    address: s.account.address,
    account: s.account,
    walletClient: s.walletClient,
    publicClient,
    mode: "session" as const,
  };
}

export type WriteArgs = {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

export async function writeWithActive(
  mode: ActiveWalletMode,
  externalAddress: Address | null | undefined,
  args: WriteArgs
): Promise<Hex> {
  const clients = await getActiveClients(mode, externalAddress);
  if (mode === "session") {
    return clients.walletClient.writeContract({
      address: args.address,
      abi: args.abi,
      functionName: args.functionName,
      args: args.args as never,
      value: args.value,
      account: clients.account,
      chain: robinhoodChain,
    } as never) as Promise<Hex>;
  }
  return clients.walletClient.writeContract({
    address: args.address,
    abi: args.abi,
    functionName: args.functionName,
    args: args.args as never,
    value: args.value,
    account: externalAddress!,
    chain: robinhoodChain,
  } as never) as Promise<Hex>;
}

/** EIP-191 personal_sign for launcher X verification */
export async function signMessageWithActive(
  mode: ActiveWalletMode,
  externalAddress: Address | null | undefined,
  message: string
): Promise<Hex> {
  const clients = await getActiveClients(mode, externalAddress);
  if (mode === "session") {
    return clients.walletClient.signMessage({
      account: clients.account,
      message,
    }) as Promise<Hex>;
  }
  return clients.walletClient.signMessage({
    account: externalAddress!,
    message,
  }) as Promise<Hex>;
}

/** Send a raw tx on any chain (Relay bridge origin, Uni swap on RH, etc.). */
export async function sendRawTransaction(
  mode: ActiveWalletMode,
  externalAddress: Address | null | undefined,
  tx: { to: Address; data?: Hex; value?: bigint; chainId: number }
): Promise<Hex> {
  if (mode === "session") {
    const { privateKey } = getOrCreateSessionWallet();
    const account = privateKeyToAccount(privateKey);
    // Session key is the same EOA on all EVM chains
    const chain = {
      id: tx.chainId,
      name: `chain-${tx.chainId}`,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: {
          http: [
            tx.chainId === 4663
              ? ROBINHOOD_CHAIN.rpcUrls.default.http[0]
              : tx.chainId === 1
                ? "https://ethereum.publicnode.com"
                : tx.chainId === 8453
                  ? "https://base.publicnode.com"
                  : tx.chainId === 42161
                    ? "https://arbitrum-one.publicnode.com"
                    : tx.chainId === 10
                      ? "https://optimism.publicnode.com"
                      : "https://ethereum.publicnode.com",
          ],
        },
      },
    } as const;
    const walletClient = createWalletClient({
      account,
      chain: chain as never,
      transport: http(chain.rpcUrls.default.http[0]),
    });
    return walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value ?? 0n,
      chain: chain as never,
      account,
    } as never) as Promise<Hex>;
  }

  // External (MetaMask): switch chain then send
  const eth = getInjectedProvider();
  if (!eth) throw new Error("No browser wallet");
  if (!externalAddress) throw new Error("Connect a wallet first");

  const chainIdHex = `0x${tx.chainId.toString(16)}`;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (e) {
    const err = e as { code?: number };
    if (err?.code === 4902 && tx.chainId === 4663) {
      await ensureRobinhoodChain(eth);
    } else if (err?.code === 4902) {
      throw new Error(
        `Add chain ${tx.chainId} in your wallet, then try again`
      );
    } else {
      throw e;
    }
  }

  const hash = (await eth.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: externalAddress,
        to: tx.to,
        data: tx.data || "0x",
        value: `0x${(tx.value ?? 0n).toString(16)}`,
      },
    ],
  })) as Hex;
  return hash;
}
