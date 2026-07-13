"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Address, Hex } from "viem";
import { formatEther } from "viem";
import {
  clearSessionWallet,
  getOrCreateSessionWallet,
  getSessionEthBalance,
  importSessionWallet,
} from "@/lib/sessionWallet";
import {
  connectInjectedWallet,
  getActiveClients,
  getInjectedProvider,
  type ActiveWalletMode,
  writeWithActive,
  signMessageWithActive,
  type WriteArgs,
  getPublicClient,
} from "@/lib/wallet-tx";

type AuthContextValue = {
  ready: boolean;
  isLoggedIn: boolean;
  mode: ActiveWalletMode | null;
  address: Address | null;
  ethBalance: string;
  loginWithSession: () => void;
  /** Connect MetaMask. forcePicker=true opens account chooser (switch account). */
  loginWithInjected: (opts?: { forcePicker?: boolean }) => Promise<void>;
  /** Import a private key as the quick wallet and log in with it. */
  importQuickWallet: (privateKey: string) => void;
  /** Wipe quick wallet from this browser and create a fresh one. */
  resetQuickWallet: () => void;
  logout: () => void;
  setMode: (m: ActiveWalletMode) => void;
  refreshBalance: () => Promise<void>;
  writeContract: (args: WriteArgs) => Promise<Hex>;
  signMessage: (message: string) => Promise<Hex>;
  getClients: () => ReturnType<typeof getActiveClients>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_MODE = "hoodmemes_auth_mode";
const LS_EXT = "hoodmemes_ext_address";
const LS_LOGGED = "hoodmemes_logged_in";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [mode, setModeState] = useState<ActiveWalletMode | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [ethBalance, setEthBalance] = useState("—");

  const refreshBalance = useCallback(async () => {
    if (!loggedIn || !mode) {
      setEthBalance("—");
      return;
    }
    try {
      if (mode === "session") {
        const b = await getSessionEthBalance();
        setEthBalance(Number(formatEther(b)).toFixed(5));
      } else if (address) {
        const pc = getPublicClient();
        const b = await pc.getBalance({ address });
        setEthBalance(Number(formatEther(b)).toFixed(5));
      }
    } catch {
      setEthBalance("?");
    }
  }, [loggedIn, mode, address]);

  useEffect(() => {
    try {
      const was = localStorage.getItem(LS_LOGGED) === "1";
      const m = localStorage.getItem(LS_MODE) as ActiveWalletMode | null;
      const ext = localStorage.getItem(LS_EXT) as Address | null;
      if (was && m === "session") {
        const { account } = getOrCreateSessionWallet();
        setModeState("session");
        setAddress(account.address);
        setLoggedIn(true);
      } else if (was && m === "external" && ext) {
        setModeState("external");
        setAddress(ext);
        setLoggedIn(true);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Keep UI in sync when user switches account inside MetaMask
  useEffect(() => {
    const eth = getInjectedProvider();
    if (!eth?.on) return;

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      if (!list?.length) {
        // disconnected in extension
        setLoggedIn(false);
        setModeState(null);
        setAddress(null);
        setEthBalance("—");
        localStorage.removeItem(LS_LOGGED);
        localStorage.removeItem(LS_MODE);
        localStorage.removeItem(LS_EXT);
        return;
      }
      const next = list[0] as Address;
      if (mode === "external" || localStorage.getItem(LS_MODE) === "external") {
        setModeState("external");
        setAddress(next);
        setLoggedIn(true);
        localStorage.setItem(LS_LOGGED, "1");
        localStorage.setItem(LS_MODE, "external");
        localStorage.setItem(LS_EXT, next);
      }
    };

    eth.on("accountsChanged", onAccounts);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
    };
  }, [mode]);

  useEffect(() => {
    if (loggedIn) refreshBalance();
    const id = setInterval(() => {
      if (loggedIn) refreshBalance();
    }, 12_000);
    return () => clearInterval(id);
  }, [loggedIn, refreshBalance]);

  const loginWithSession = useCallback(() => {
    const { account } = getOrCreateSessionWallet();
    setModeState("session");
    setAddress(account.address);
    setLoggedIn(true);
    localStorage.setItem(LS_LOGGED, "1");
    localStorage.setItem(LS_MODE, "session");
    localStorage.removeItem(LS_EXT);
  }, []);

  const loginWithInjected = useCallback(
    async (opts?: { forcePicker?: boolean }) => {
      const addr = await connectInjectedWallet({
        forcePicker: opts?.forcePicker ?? true,
      });
      setModeState("external");
      setAddress(addr);
      setLoggedIn(true);
      localStorage.setItem(LS_LOGGED, "1");
      localStorage.setItem(LS_MODE, "external");
      localStorage.setItem(LS_EXT, addr);
    },
    []
  );

  const importQuickWallet = useCallback((privateKey: string) => {
    const account = importSessionWallet(
      (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as Hex
    );
    setModeState("session");
    setAddress(account.address);
    setLoggedIn(true);
    localStorage.setItem(LS_LOGGED, "1");
    localStorage.setItem(LS_MODE, "session");
    localStorage.removeItem(LS_EXT);
  }, []);

  const resetQuickWallet = useCallback(() => {
    clearSessionWallet();
    const { account } = getOrCreateSessionWallet();
    setModeState("session");
    setAddress(account.address);
    setLoggedIn(true);
    localStorage.setItem(LS_LOGGED, "1");
    localStorage.setItem(LS_MODE, "session");
    localStorage.removeItem(LS_EXT);
  }, []);

  const logout = useCallback(() => {
    setLoggedIn(false);
    setModeState(null);
    setAddress(null);
    setEthBalance("—");
    localStorage.removeItem(LS_LOGGED);
    localStorage.removeItem(LS_MODE);
    localStorage.removeItem(LS_EXT);
    // Keep quick-wallet key so accidental logout doesn't lose funds —
    // use resetQuickWallet / import to change it.
  }, []);

  const setMode = useCallback(
    (m: ActiveWalletMode) => {
      if (m === "session") {
        loginWithSession();
      }
    },
    [loginWithSession]
  );

  const writeContract = useCallback(
    async (args: WriteArgs) => {
      if (!loggedIn || !mode) throw new Error("Log in first");
      return writeWithActive(mode, address, args);
    },
    [loggedIn, mode, address]
  );

  const signMessage = useCallback(
    async (message: string) => {
      if (!loggedIn || !mode) throw new Error("Log in first");
      return signMessageWithActive(mode, address, message);
    },
    [loggedIn, mode, address]
  );

  const getClients = useCallback(() => {
    if (!mode) throw new Error("Not logged in");
    return getActiveClients(mode, address);
  }, [mode, address]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isLoggedIn: loggedIn,
      mode,
      address,
      ethBalance,
      loginWithSession,
      loginWithInjected,
      importQuickWallet,
      resetQuickWallet,
      logout,
      setMode,
      refreshBalance,
      writeContract,
      signMessage,
      getClients,
    }),
    [
      ready,
      loggedIn,
      mode,
      address,
      ethBalance,
      loginWithSession,
      loginWithInjected,
      importQuickWallet,
      resetQuickWallet,
      logout,
      setMode,
      refreshBalance,
      writeContract,
      signMessage,
      getClients,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
