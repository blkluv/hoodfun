"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { shortAddr, timeAgo } from "@/lib/format";
import { ROBINHOOD_CHAIN } from "@/lib/chain";

type ChatMsg = {
  id: string;
  at: number;
  address: string;
  text: string;
  handle?: string;
};

export function TokenChat({
  token,
  symbol,
}: {
  token: string;
  symbol?: string;
}) {
  const { address, isLoggedIn, loginWithSession, loginWithInjected } =
    useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/token-chat?token=${token}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 6_000);
    return () => clearInterval(id);
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn || !address) {
      setErr("Connect a wallet to chat");
      return;
    }
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/token-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          address,
          text: t,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setText("");
      if (data.message) {
        setMessages((m) => [data.message as ChatMsg, ...m.filter((x) => x.id !== data.message.id)]);
      } else {
        await load();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  const tick = symbol ? `$${symbol}` : "token";

  return (
    <div className="flex h-[420px] flex-col sm:h-[480px] lg:h-[520px]">
      <div className="flex items-center justify-between border-b border-[#2a2f37] px-3 py-2">
        <div>
          <div className="text-xs font-bold text-[#e8eaed]">
            Community chat
          </div>
          <div className="text-[10px] text-[#9aa3ab]">
            On-site · {tick} · public · anti-scam (no links)
          </div>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="text-[10px] font-semibold text-[#9aa3ab] hover:text-[#ccff00]"
        >
          Refresh
        </button>
      </div>

      <div
        ref={listRef}
        className="hm-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3"
      >
        {loading && (
          <p className="text-center text-xs text-[#9aa3ab]">Loading chat…</p>
        )}
        {!loading && messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#2a2f37] bg-[#0e1116] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[#e8eaed]">
              No messages yet
            </p>
            <p className="mt-1 text-[11px] text-[#9aa3ab]">
              Be first — say GM, drop alpha, or hype the chart. Holders +
              trenchers welcome.
            </p>
          </div>
        )}
        {/* newest first for feed style; reverse visual with flex-col-reverse alternative - show chronological oldest top */}
        {[...messages].reverse().map((m) => {
          const mine =
            address && m.address.toLowerCase() === address.toLowerCase();
          return (
            <div
              key={m.id}
              className={`rounded-xl border px-3 py-2 ${
                mine
                  ? "border-[#ccff00]/25 bg-[#ccff00]/[0.07]"
                  : "border-[#2a2f37] bg-[#0e1116]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                {m.handle ? (
                  <a
                    href={`https://x.com/${m.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#ccff00] hover:underline"
                  >
                    @{m.handle}
                  </a>
                ) : (
                  <a
                    href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${m.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-semibold text-[#9aa3ab] hover:text-[#ccff00]"
                  >
                    {shortAddr(m.address, 4)}
                  </a>
                )}
                <span className="text-[#9aa3ab]/50">{timeAgo(m.at)}</span>
                {mine && (
                  <span className="rounded bg-[#ccff00]/20 px-1 font-bold text-[#ccff00]">
                    you
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-snug text-[#e8eaed] break-words">
                {m.text}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#2a2f37] bg-[#0e1116]/80 p-3">
        {!isLoggedIn ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 text-[11px] text-[#9aa3ab]">
              Log in to chat with other {tick} trenchers.
            </p>
            <button
              type="button"
              onClick={() => loginWithSession()}
              className="rounded-lg bg-[#ccff00] px-3 py-1.5 text-[11px] font-black text-black"
            >
              Quick wallet
            </button>
            <button
              type="button"
              onClick={() => loginWithInjected().catch(() => {})}
              className="rounded-lg border border-[#2a2f37] px-3 py-1.5 text-[11px] font-semibold text-[#e8eaed]"
            >
              MetaMask
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              placeholder={`Message the ${tick} chat…`}
              maxLength={280}
              className="min-w-0 flex-1 rounded-xl border border-[#2a2f37] bg-[#171b21] px-3 py-2.5 text-sm text-[#e8eaed] outline-none placeholder:text-[#9aa3ab]/50 focus:border-[#ccff00]/40"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="shrink-0 rounded-xl bg-[#ccff00] px-4 py-2.5 text-sm font-black text-black disabled:opacity-40"
            >
              {busy ? "…" : "Send"}
            </button>
          </form>
        )}
        {err && (
          <p className="mt-1.5 text-[11px] text-rose-300">{err}</p>
        )}
        <p className="mt-1.5 text-[9px] text-[#9aa3ab]/60">
          Public chat · no links · be cool · not financial advice ·{" "}
          {text.length}/280
        </p>
      </div>
    </div>
  );
}
