"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther, type Address } from "viem";
import { useAuth } from "./AuthProvider";
import { ConnectModal } from "./ConnectModal";
import {
  extractRelayRequestId,
  extractRelayTransactions,
  getRelayBridgeQuote,
  getRelayStatus,
  RELAY_FROM_CHAINS,
  relayBridgeUrl,
  type RelayQuote,
} from "@/lib/relay";
import {
  buildApprove,
  buildV2BuyEth,
  buildV3BuyEth,
  buildV3SellToken,
  SWAP_ROUTER02,
} from "@/lib/rh-swap";
import { getPublicClient, sendRawTransaction } from "@/lib/wallet-tx";
import { shortAddr } from "@/lib/format";

const QUICK_ETH = ["0.01", "0.05", "0.1", "0.25"] as const;

type Tab = "swap" | "bridge";
type Side = "buy" | "sell";

export function SwapBridgePanel({
  token,
  symbol = "TOKEN",
  /** Prefer v3 for HoodMemes launches; auto falls back messaging */
  poolKind = "v3",
  defaultTab = "swap",
  /** Hide swap tab — bridge-only (e.g. /bridge page) */
  bridgeOnly = false,
}: {
  token?: string;
  symbol?: string;
  poolKind?: "v3" | "v2" | "auto";
  defaultTab?: Tab;
  bridgeOnly?: boolean;
}) {
  const { isLoggedIn, address, mode, ethBalance, refreshBalance } = useAuth();
  const [tab, setTab] = useState<Tab>(bridgeOnly ? "bridge" : defaultTab);
  const [side, setSide] = useState<Side>("buy");
  const [ethIn, setEthIn] = useState("0.05");
  const [tokenIn, setTokenIn] = useState("");
  const [tokenBal, setTokenBal] = useState<bigint | null>(null);
  const [fromChainId, setFromChainId] = useState(8453);
  const [bridgeAmount, setBridgeAmount] = useState("0.05");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [quote, setQuote] = useState<RelayQuote | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const canSwap = Boolean(token && /^0x[a-fA-F0-9]{40}$/i.test(token));
  const tokenAddr = (token || "0x0000000000000000000000000000000000000000") as Address;
  const kind = poolKind === "auto" ? "v3" : poolKind;

  const refreshTokenBal = useCallback(async () => {
    if (!address || !canSwap) {
      setTokenBal(null);
      return;
    }
    try {
      const pc = getPublicClient();
      const bal = await pc.readContract({
        address: tokenAddr,
        abi: [
          {
            type: "function",
            name: "balanceOf",
            stateMutability: "view",
            inputs: [{ name: "a", type: "address" }],
            outputs: [{ type: "uint256" }],
          },
        ] as const,
        functionName: "balanceOf",
        args: [address as Address],
      });
      setTokenBal(bal as bigint);
    } catch {
      setTokenBal(null);
    }
  }, [address, tokenAddr, canSwap]);

  useEffect(() => {
    refreshTokenBal();
  }, [refreshTokenBal]);

  const relayLink = useMemo(() => {
    if (!address) return "https://relay.link/bridge/robinhood";
    return relayBridgeUrl({
      toAddress: address,
      amountEth: bridgeAmount || undefined,
      fromChainId,
    });
  }, [address, bridgeAmount, fromChainId]);

  async function ensureLogin() {
    if (isLoggedIn && address) return true;
    setConnectOpen(true);
    return false;
  }

  async function onSwap() {
    setErr(null);
    setStatus(null);
    setTxHash(null);
    if (!canSwap) {
      setErr("No token selected for swap");
      return;
    }
    if (!(await ensureLogin()) || !address || !mode) return;

    setBusy(true);
    try {
      if (side === "buy") {
        const eth = Number(ethIn);
        if (!Number.isFinite(eth) || eth <= 0) {
          throw new Error("Enter a valid ETH amount");
        }
        const tx =
          kind === "v2"
            ? buildV2BuyEth({
                token: tokenAddr,
                recipient: address as Address,
                amountEth: ethIn,
              })
            : buildV3BuyEth({
                token: tokenAddr,
                recipient: address as Address,
                amountEth: ethIn,
              });
        setStatus("Confirm buy in wallet…");
        const hash = await sendRawTransaction(mode, address as Address, {
          to: tx.to,
          data: tx.data,
          value: tx.value,
          chainId: 4663,
        });
        setTxHash(hash);
        setStatus("Buy submitted on Robinhood Chain");
      } else {
        if (!tokenIn || Number(tokenIn) <= 0) {
          throw new Error("Enter token amount to sell");
        }
        const amountIn = parseEther(tokenIn);
        // approve then sell (V3)
        setStatus("Approve token…");
        const appr = buildApprove({
          token: tokenAddr,
          spender: SWAP_ROUTER02,
          amount: amountIn,
        });
        await sendRawTransaction(mode, address as Address, {
          to: appr.to,
          data: appr.data,
          value: 0n,
          chainId: 4663,
        });
        setStatus("Confirm sell in wallet…");
        const sell = buildV3SellToken({
          token: tokenAddr,
          recipient: address as Address,
          amountIn,
        });
        const hash = await sendRawTransaction(mode, address as Address, {
          to: sell.to,
          data: sell.data,
          value: 0n,
          chainId: 4663,
        });
        setTxHash(hash);
        setStatus("Sell submitted on Robinhood Chain");
      }
      await refreshBalance();
      await refreshTokenBal();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Swap failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function onRelayQuoteAndBridge() {
    setErr(null);
    setStatus(null);
    setTxHash(null);
    setQuote(null);
    if (!(await ensureLogin()) || !address || !mode) return;

    const amt = Number(bridgeAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Enter a valid ETH amount to bridge");
      return;
    }

    setBusy(true);
    try {
      setStatus("Getting Relay quote…");
      const amountWei = parseEther(bridgeAmount).toString();
      const q = await getRelayBridgeQuote({
        user: address as Address,
        originChainId: fromChainId,
        amountWei,
        recipient: address as Address,
      });
      setQuote(q);

      const txs = extractRelayTransactions(q);
      if (!txs.length) {
        throw new Error(
          "Relay returned no executable steps — try the Relay app link below"
        );
      }

      const requestId = extractRelayRequestId(q);
      for (let i = 0; i < txs.length; i++) {
        const t = txs[i];
        setStatus(
          `Confirm Relay deposit on chain ${t.chainId} (${i + 1}/${txs.length})…`
        );
        const hash = await sendRawTransaction(mode, address as Address, {
          to: t.to,
          data: t.data,
          value: t.value,
          chainId: t.chainId,
        });
        setTxHash(hash);
      }

      if (requestId) {
        setStatus("Waiting for Relay fill on Robinhood…");
        for (let i = 0; i < 90; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          const st = await getRelayStatus(requestId);
          if (st.status === "success") {
            setStatus("Bridge complete — ETH on Robinhood Chain");
            await refreshBalance();
            return;
          }
          if (st.status === "failure" || st.status === "refund") {
            throw new Error(`Relay status: ${st.status}`);
          }
          setStatus(`Relay status: ${st.status || "pending"}…`);
        }
        setStatus(
          "Submitted — fill may still complete. Check Relay status / balance."
        );
      } else {
        setStatus("Deposit sent — ETH should arrive on Robinhood shortly");
      }
      await refreshBalance();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bridge failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  const outPreview = quote?.details?.currencyOut?.amount
    ? formatEther(BigInt(quote.details.currencyOut.amount))
    : null;
  const feeUsd = quote?.fees?.relayer?.amountUsd;

  return (
    <div className="rounded-lg border border-[#2a2f37] bg-[#171b21] p-4 shadow-sm">
      {/* Tabs */}
      {!bridgeOnly && canSwap && (
        <div className="mb-3 flex gap-1 rounded-md bg-[#0e1116] p-1">
          {(
            [
              ["swap", "Swap"],
              ["bridge", "Bridge"],
            ] as const
          ).map(([id, lab]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setErr(null);
                setStatus(null);
              }}
              className={`flex-1 rounded py-1.5 text-sm font-semibold transition ${
                tab === id
                  ? "bg-[#00c805] text-black"
                  : "text-[#9aa3ab] hover:text-[#e8eaed]"
              }`}
            >
              {lab}
            </button>
          ))}
        </div>
      )}
      {(bridgeOnly || !canSwap) && (
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#9aa3ab]">
            Bridge to Robinhood
          </div>
          <span className="rounded bg-[#00c805]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#00c805]">
            Relay
          </span>
        </div>
      )}

      {!isLoggedIn && (
        <button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="mb-3 w-full rounded-md border border-[#2a2f37] py-2 text-xs font-semibold text-[#9aa3ab] hover:text-[#e8eaed]"
        >
          Connect wallet to trade / bridge
        </button>
      )}

      {isLoggedIn && address && (
        <div className="mb-3 flex items-center justify-between text-[11px] text-[#9aa3ab]">
          <span className="font-mono">{shortAddr(address, 4)}</span>
          <span>
            {ethBalance} ETH on RH ·{" "}
            {mode === "session" ? "quick" : "wallet"}
          </span>
        </div>
      )}

      {tab === "swap" && canSwap && (
        <div className="space-y-3">
          <div className="flex gap-1 rounded-md bg-[#0e1116] p-1">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`flex-1 rounded py-1.5 text-sm font-semibold ${
                side === "buy"
                  ? "bg-[#00c805] text-black"
                  : "text-[#9aa3ab]"
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`flex-1 rounded py-1.5 text-sm font-semibold ${
                side === "sell"
                  ? "bg-[#f2555a] text-white"
                  : "text-[#9aa3ab]"
              }`}
            >
              Sell
            </button>
          </div>

          {side === "buy" ? (
            <>
              <label className="block">
                <span className="text-[11px] text-[#9aa3ab]">You pay (ETH)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={ethIn}
                  onChange={(e) => setEthIn(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#2a2f37] bg-[#0e1116] px-3 py-2.5 font-mono text-sm text-[#e8eaed] outline-none focus:border-[#00c805]/60"
                />
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_ETH.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setEthIn(v)}
                    className={`rounded-md py-1.5 text-xs font-semibold ${
                      ethIn === v
                        ? "bg-[#00c805] text-black"
                        : "border border-[#2a2f37] text-[#9aa3ab]"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#9aa3ab]">
                You get ≈ ${symbol} via Uniswap {kind.toUpperCase()} on RH
              </p>
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-[11px] text-[#9aa3ab]">
                  You sell (${symbol})
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#2a2f37] bg-[#0e1116] px-3 py-2.5 font-mono text-sm text-[#e8eaed] outline-none focus:border-[#00c805]/60"
                />
              </label>
              {tokenBal != null && (
                <button
                  type="button"
                  className="text-[11px] text-[#00c805]"
                  onClick={() => setTokenIn(formatEther(tokenBal))}
                >
                  Max {Number(formatEther(tokenBal)).toPrecision(6)}
                </button>
              )}
              <p className="text-[11px] text-[#9aa3ab]">
                You get ≈ ETH (V3 pool · approve required)
              </p>
            </>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={onSwap}
            className="w-full rounded-md bg-[#00c805] py-3 text-sm font-bold text-black hover:bg-[#00e006] disabled:opacity-50"
          >
            {busy
              ? "Working…"
              : side === "buy"
                ? `Buy $${symbol}`
                : `Sell $${symbol}`}
          </button>
          <p className="text-center text-[10px] text-[#9aa3ab]">
            Low ETH on RH? Use the Bridge tab (Relay).
          </p>
        </div>
      )}

      {(tab === "bridge" || bridgeOnly || !canSwap) && (
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-[#9aa3ab]">
            Powered by{" "}
            <a
              href="https://relay.link"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#00c805] hover:underline"
            >
              Relay
            </a>
            — bridge ETH onto Robinhood Chain (4663) in seconds. Funds arrive on
            the same wallet address.
          </p>

          <label className="block">
            <span className="text-[11px] text-[#9aa3ab]">From chain</span>
            <select
              value={fromChainId}
              onChange={(e) => setFromChainId(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-[#2a2f37] bg-[#0e1116] px-3 py-2.5 text-sm text-[#e8eaed] outline-none"
            >
              {RELAY_FROM_CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] text-[#9aa3ab]">Amount (ETH)</span>
            <input
              type="number"
              min="0"
              step="any"
              value={bridgeAmount}
              onChange={(e) => setBridgeAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#2a2f37] bg-[#0e1116] px-3 py-2.5 font-mono text-sm text-[#e8eaed] outline-none focus:border-[#00c805]/60"
            />
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_ETH.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setBridgeAmount(v)}
                className={`rounded-md py-1.5 text-xs font-semibold ${
                  bridgeAmount === v
                    ? "bg-[#00c805] text-black"
                    : "border border-[#2a2f37] text-[#9aa3ab]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {outPreview && (
            <div className="rounded-md border border-[#2a2f37] bg-[#0e1116] px-3 py-2 text-[11px] text-[#9aa3ab]">
              Est. receive ≈{" "}
              <strong className="text-[#e8eaed]">
                {Number(outPreview).toPrecision(6)} ETH
              </strong>{" "}
              on RH
              {feeUsd ? ` · relay fee ~$${feeUsd}` : ""}
              {quote?.details?.timeEstimate
                ? ` · ~${quote.details.timeEstimate}s`
                : ""}
            </div>
          )}

          <button
            type="button"
            disabled={busy || !isLoggedIn}
            onClick={onRelayQuoteAndBridge}
            className="w-full rounded-md bg-[#00c805] py-3 text-sm font-bold text-black hover:bg-[#00e006] disabled:opacity-50"
          >
            {busy ? "Bridging…" : "Bridge with Relay"}
          </button>

          <a
            href={relayLink}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-md border border-[#2a2f37] py-2.5 text-xs font-semibold text-[#9aa3ab] hover:text-[#e8eaed]"
          >
            Open full Relay app ↗
          </a>
          <p className="text-[10px] leading-relaxed text-[#9aa3ab]">
            Wallet must hold ETH on the <em>from</em> chain. After bridge,
            switch back to Robinhood (4663) to swap.
          </p>
        </div>
      )}

      {status && (
        <p className="mt-3 text-[11px] font-medium text-[#00c805]">{status}</p>
      )}
      {txHash && (
        <p className="mt-1 break-all font-mono text-[10px] text-[#9aa3ab]">
          tx {txHash}
        </p>
      )}
      {err && (
        <p className="mt-2 text-[11px] text-[#f2555a]">{err}</p>
      )}

      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Connect to trade"
      />
    </div>
  );
}
