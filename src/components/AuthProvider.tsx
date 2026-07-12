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
import type { Address } from "viem";
import { formatEther } from "viem";
import {
  getOrCreateSessionWallet,
  getSessionEthBalance,
} from "@/lib/sessionWallet";
import {
  connectInjectedWallet,
  getActiveClients,
  type ActiveWalletMode,
  writeWithActive,
  type WriteArgs,
  getPublicClient,
} from "@/lib/wallet-tx";
import type { Hex } from "viem";

type AuthContextValue = {
  ready: boolean;
  isLoggedIn: boolean;
  mode: ActiveWalletMode | null;
  address: Address | null;
  ethBalance: string;
  loginWithSession: () => void;
  loginWithInjected: () => Promise<void>;
  logout: () => void;
  setMode: (m: ActiveWalletMode) => void;
  refreshBalance: () => Promise<void>;
  writeContract: (args: WriteArgs) => Promise<Hex>;
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

  const loginWithInjected = useCallback(async () => {
    const addr = await connectInjectedWallet();
    setModeState("external");
    setAddress(addr);
    setLoggedIn(true);
    localStorage.setItem(LS_LOGGED, "1");
    localStorage.setItem(LS_MODE, "external");
    localStorage.setItem(LS_EXT, addr);
  }, []);

  const logout = useCallback(() => {
    setLoggedIn(false);
    setModeState(null);
    setAddress(null);
    setEthBalance("—");
    localStorage.removeItem(LS_LOGGED);
    localStorage.removeItem(LS_MODE);
    localStorage.removeItem(LS_EXT);
    // session private key stays in storage until user resets on account page
  }, []);

  const setMode = useCallback(
    (m: ActiveWalletMode) => {
      if (m === "session") {
        loginWithSession();
      } else if (address && mode === "external") {
        setModeState("external");
        localStorage.setItem(LS_MODE, "external");
      }
    },
    [loginWithSession, address, mode]
  );

  const writeContract = useCallback(
    async (args: WriteArgs) => {
      if (!loggedIn || !mode) throw new Error("Log in first");
      return writeWithActive(mode, address, args);
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
      logout,
      setMode,
      refreshBalance,
      writeContract,
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
      logout,
      setMode,
      refreshBalance,
      writeContract,
      getClients,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
