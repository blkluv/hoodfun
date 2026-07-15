"use client";

import { useState } from "react";
import Link from "next/link";

const CONTACT_EMAIL = "admin@hoodmemes.fun";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject: subject || "Website contact",
          message,
          company,
          source: "contact-page",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Send failed");
      }
      setOk(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-black text-white">Contact</h1>
        <p className="mt-2 text-sm text-white/45">
          Partnerships, support, press, or general questions. We read everything
          that hits{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-[#ccff00] hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>

      <div className="rounded-2xl border border-[#ccff00]/25 bg-[#ccff00]/[0.07] p-4 text-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#ccff00]">
          Email us directly
        </div>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=HoodMemes%20inquiry`}
          className="mt-1 block text-lg font-black text-white hover:text-[#ccff00]"
        >
          {CONTACT_EMAIL}
        </a>
        <p className="mt-1 text-[11px] text-white/40">
          Best for partnership intros and longer threads.
        </p>
      </div>

      {ok ? (
        <div className="rounded-2xl border border-[#ccff00]/30 bg-[#ccff00]/10 p-6 text-center">
          <div className="text-lg font-black text-white">Message sent</div>
          <p className="mt-2 text-sm text-white/50">
            Thanks — we&apos;ll get back when we can. For urgent partner stuff,
            also email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ccff00]">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => setOk(false)}
            className="mt-4 text-xs font-semibold text-[#ccff00] hover:underline"
          >
            Send another
          </button>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Or use the form
          </div>

          {/* honeypot */}
          <input
            type="text"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
          />

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-white/50">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ccff00]/45"
              placeholder="Your name"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-white/50">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ccff00]/45"
              placeholder="you@company.com"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-white/50">
              Subject
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ccff00]/45"
              placeholder="Partnership / support / other"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-white/50">
              Message
            </span>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ccff00]/45"
              placeholder="How can we help?"
            />
          </label>

          {err && (
            <p className="text-xs text-rose-300">{err}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#ccff00] py-3 text-sm font-black text-black disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send message"}
          </button>

          <p className="text-center text-[10px] text-white/30">
            Messages go to the HoodMemes team inbox. Not financial advice.
          </p>
        </form>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/" className="font-semibold text-[#ccff00] hover:underline">
          ← Board
        </Link>
        <Link
          href="/how-it-works"
          className="font-semibold text-white/45 hover:text-[#ccff00]"
        >
          How it works
        </Link>
        <a
          href="https://x.com/hoodmemesdotfun"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-white/45 hover:text-[#ccff00]"
        >
          𝕏 @hoodmemesdotfun
        </a>
      </div>
    </div>
  );
}
