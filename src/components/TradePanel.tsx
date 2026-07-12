"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatEther,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { marketAbi, erc20Abi } from "@/lib/abis";
import { getSessionWalletClient } from "@/lib/sessionWallet";
import { QuickWallet } from "./QuickWallet";
import { shortAddr } from "@/lib/format";

type Props = {
  marketAddress: Address;
  tokenAddress: Address;
  symbol?: string;
};

export function TradePanel({ marketAddress, tokenAddress, symbol = "TOKEN" }: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.01");
  const [quote, setQuote] = useState<string>("—");
  const [feeNote, setFeeNote] = useState<string>("");
  const [tokenBal, setTokenBal] = useState<string>("0");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [burnAmt, setBurnAmt] = useState("");

  const refreshBal = useCallback(async () => {
    try {
      const { account, publicClient } = getSessionWalletClient();
      const bal = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account.address],
      });
      setTokenBal(Number(formatEther(bal as bigint)).toFixed(4));
    } catch {
      /* ignore */
    }
  }, [tokenAddress]);

  const refreshQuote = useCallback(async () => {
    try {
      const { publicClient } = getSessionWalletClient();
      if (side === "buy") {
        const ethIn = parseEther(amount || "0");
        if (ethIn === 0n) {
          setQuote("—");
          return;
        }
        const [tokensOut, tokensBurned, feeEth] = (await publicClient.readContract({
          address: marketAddress,
          abi: marketAbi,
          functionName: "getBuyQuote",
          args: [ethIn],
        })) as [bigint, bigint, bigint];
        setQuote(`${Number(formatEther(tokensOut)).toLocaleString(undefined, { maximumFractionDigits: 2 })} $${symbol}`);
        setFeeNote(
          `fee ${Number(formatEther(feeEth)).toFixed(5)} ETH · burn ${Number(formatEther(tokensBurned)).toLocaleString(undefined, { maximumFractionDigits: 0 })} tokens`
        );
      } else {
        const tokIn = parseEther(amount || "0");
        if (tokIn === 0n) {
          setQuote("—");
          return;
        }
        const [ethOut, feeEth] = (await publicClient.readContract({
          address: marketAddress,
          abi: marketAbi,
          functionName: "getSellQuote",
          args: [tokIn],
        })) as [bigint, bigint];
        setQuote(`${Number(formatEther(ethOut)).toFixed(6)} ETH`);
        setFeeNote(`fee ${Number(formatEther(feeEth)).toFixed(6)} ETH`);
      }
    } catch {
      setQuote("—");
      setFeeNote("");
    }
  }, [amount, marketAddress, side, symbol]);

  useEffect(() => {
    refreshBal();
    refreshQuote();
  }, [refreshBal, refreshQuote]);

  async function execute() {
    setBusy(true);
    setErr(null);
    setTx(null);
    try {
      const { account, walletClient, publicClient } = getSessionWalletClient();
      if (side === "buy") {
        const value = parseEther(amount || "0");
        if (value === 0n) throw new Error("Enter ETH amount");
        const hash = await walletClient.writeContract({
          address: marketAddress,
          abi: marketAbi,
          functionName: "buy",
          args: [account.address, 0n],
          value,
          account,
          chain: walletClient.chain,
        });
        setTx(hash);
        await publicClient.waitForTransactionReceipt({ hash: hash as Hex });
      } else {
        const tokensIn = parseEther(amount || "0");
        if (tokensIn === 0n) throw new Error("Enter token amount");
        const hash = await walletClient.writeContract({
          address: marketAddress,
          abi: marketAbi,
          functionName: "sell",
          args: [tokensIn, 0n],
          account,
          chain: walletClient.chain,
        });
        setTx(hash);
        await publicClient.waitForTransactionReceipt({ hash: hash as Hex });
      }
      await refreshBal();
      await refreshQuote();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setBusy(false);
    }
  }

  async function doBurn() {
    setBusy(true);
    setErr(null);
    try {
      const { account, walletClient, publicClient } = getSessionWalletClient();
      const amountWei = parseEther(burnAmt || "0");
      if (amountWei === 0n) throw new Error("Enter burn amount");
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "burn",
        args: [amountWei],
        account,
        chain: walletClient.chain,
      });
      setTx(hash);
      await publicClient.waitForTransactionReceipt({ hash: hash as Hex });
      setBurnAmt("");
      await refreshBal();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Burn failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <QuickWallet compact />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div className="flex gap-1 rounded-xl bg-black/30 p-1">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                side === s
                  ? s === "buy"
                    ? "bg-[#00c805] text-black"
                    : "bg-rose-500 text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-white/45">
            {side === "buy" ? "You pay (ETH)" : `You sell ($${symbol})`}
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="any"
            min="0"
            className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-[#00c805]/45"
          />
          {side === "sell" && (
            <button
              type="button"
              className="text-[11px] text-[#00c805]"
              onClick={() => setAmount(tokenBal)}
            >
              Max ({tokenBal})
            </button>
          )}
        </label>

        <div className="rounded-xl bg-black/30 px-3 py-2 text-sm">
          <div className="text-white/40 text-xs">You receive (est.)</div>
          <div className="font-semibold text-white">{quote}</div>
          {feeNote && (
            <div className="mt-1 text-[11px] text-white/35">{feeNote}</div>
          )}
        </div>

        <div className="text-xs text-white/40">
          Your ${symbol}: <span className="text-white/80">{tokenBal}</span>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={execute}
          className={`w-full rounded-xl py-3 text-sm font-bold disabled:opacity-40 ${
            side === "buy"
              ? "bg-[#00c805] text-black hover:bg-[#00e006]"
              : "bg-rose-500 text-white hover:bg-rose-400"
          }`}
        >
          {busy ? "Confirming…" : side === "buy" ? `Buy $${symbol}` : `Sell $${symbol}`}
        </button>

        {tx && (
          <p className="break-all text-[11px] text-[#00c805]/90">
            Tx {shortAddr(tx, 8)}
          </p>
        )}
        {err && (
          <p className="text-xs text-rose-300">{err}</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/45">
          Burn tokens
        </div>
        <p className="text-[11px] text-white/40">
          Permanently destroy supply you hold (creator or any holder). Separate
          from auto-burn on buys / fee buyback-burn.
        </p>
        <div className="flex gap-2">
          <input
            value={burnAmt}
            onChange={(e) => setBurnAmt(e.target.value)}
            placeholder="Amount"
            type="number"
            min="0"
            step="any"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={doBurn}
            className="rounded-xl border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-200 hover:bg-orange-500/10"
          >
            Burn
          </button>
        </div>
      </div>

      <p className="text-[10px] text-white/25">
        Market {shortAddr(marketAddress)} · signed by quick wallet (no popup)
      </p>
    </div>
  );
}
