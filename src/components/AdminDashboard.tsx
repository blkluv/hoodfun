"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeaturedToken, SiteConfig } from "@/lib/site-config";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import { useAuth } from "./AuthProvider";

const inp =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#00c805]/45";
const btnSec =
  "rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/5";
const btnXs =
  "rounded-lg border border-white/12 px-1.5 py-0.5 text-white/70 hover:bg-white/5";

export function AdminDashboard() {
  const { address, loginWithInjected } = useAuth();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [featDraft, setFeatDraft] = useState({
    address: "",
    symbol: "",
    name: "",
    note: "",
    market: "",
  });
  const [hideDraft, setHideDraft] = useState("");
  const [blockDraft, setBlockDraft] = useState("");

  const checkSession = useCallback(async () => {
    const res = await fetch("/api/admin/session");
    const data = await res.json();
    setAuthed(!!data.ok);
    if (data.ok) {
      const c = await fetch("/api/admin/config");
      if (c.ok) {
        const j = await c.json();
        setConfig(j.config);
      }
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, wallet: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setPassword("");
      await checkSession();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
  }

  const [exportJson, setExportJson] = useState("");
  const [copied, setCopied] = useState(false);

  async function save(partial?: Partial<SiteConfig>) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    setCopied(false);
    try {
      const body = partial ?? config;
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.config) setConfig(data.config);
      const json =
        data.exportJson ||
        (data.config ? JSON.stringify(data.config) : JSON.stringify(body));
      setExportJson(json);

      if (data.ok) {
        setMsg(
          `✓ Saved via ${data.persistence}${data.hint ? ` — ${data.hint}` : ""}`
        );
        return;
      }

      // Soft failure — still show export path
      setErr(data.hint || "Could not persist permanently on this host.");
      setMsg(
        "Your changes are built below as SITE_CONFIG_JSON — copy into Vercel (one-time) or add Upstash/GITHUB_TOKEN for one-click saves."
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyExport() {
    const json = exportJson || JSON.stringify(config);
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function addFeatured() {
    if (!featDraft.address.trim()) return;
    const item: FeaturedToken = {
      address: featDraft.address.trim(),
      symbol: featDraft.symbol.trim() || undefined,
      name: featDraft.name.trim() || undefined,
      note: featDraft.note.trim() || undefined,
      market: featDraft.market.trim() || undefined,
      order: config.featured.length,
    };
    setConfig((c) => ({ ...c, featured: [...c.featured, item] }));
    setFeatDraft({ address: "", symbol: "", name: "", note: "", market: "" });
  }

  function removeFeatured(i: number) {
    setConfig((c) => ({
      ...c,
      featured: c.featured.filter((_, idx) => idx !== i),
    }));
  }

  function moveFeatured(i: number, dir: -1 | 1) {
    setConfig((c) => {
      const arr = [...c.featured];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return c;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...c, featured: arr };
    });
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-black text-white">Admin access</h1>
        <p className="text-xs text-white/40">
          Secret ops console. Not linked from the public site.
        </p>
        <form onSubmit={login} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <label className="block space-y-1">
            <span className="text-xs text-white/45">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="button"
            onClick={() => loginWithInjected().catch(() => {})}
            className="text-xs text-white/40 hover:text-[#00c805]"
          >
            Optional: connect admin wallet ({address ? address.slice(0, 8) + "…" : "not connected"})
          </button>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#00c805] py-2.5 text-sm font-bold text-black disabled:opacity-40"
          >
            Enter
          </button>
          {err && <p className="text-xs text-rose-300">{err}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">HoodMemes Admin</h1>
          <p className="text-xs text-white/40">
            Updated {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => save()}
            disabled={busy}
            className="rounded-xl bg-[#00c805] px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
          >
            Save all
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70"
          >
            Logout
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-[#00c805]/25 bg-[#00c805]/10 px-4 py-3 text-xs text-[#b8f5b8]">
          {msg}
        </div>
      )}
      {err && (
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          <p>{err}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyExport}
              className="rounded-lg bg-[#00c805] px-3 py-1.5 font-bold text-black"
            >
              {copied ? "Copied!" : "Copy SITE_CONFIG_JSON"}
            </button>
          </div>
          <ol className="list-decimal space-y-1 pl-4 text-amber-100/80">
            <li>Vercel → Project → Settings → Environment Variables</li>
            <li>
              Name: <code className="text-white">SITE_CONFIG_JSON</code> · paste
              the copied value · Production + Preview
            </li>
            <li>Deployments → … → Redeploy (or push any commit)</li>
            <li>
              Better long-term: free{" "}
              <a
                className="underline"
                href="https://console.upstash.com"
                target="_blank"
                rel="noreferrer"
              >
                Upstash Redis
              </a>{" "}
              → set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
            </li>
          </ol>
        </div>
      )}

      {/* Kill switches */}
      <Section title="Kill switches">
        <Toggle
          label="Maintenance mode (blocks most UI)"
          checked={config.maintenanceMode}
          onChange={(v) => setConfig((c) => ({ ...c, maintenanceMode: v }))}
        />
        <Toggle
          label="Launches enabled"
          checked={config.launchesEnabled}
          onChange={(v) => setConfig((c) => ({ ...c, launchesEnabled: v }))}
        />
        <Toggle
          label="Trading enabled"
          checked={config.tradingEnabled}
          onChange={(v) => setConfig((c) => ({ ...c, tradingEnabled: v }))}
        />
        <Toggle
          label="Show DexScreener board"
          checked={config.showDexBoard}
          onChange={(v) => setConfig((c) => ({ ...c, showDexBoard: v }))}
        />
        <Toggle
          label="Require login to launch"
          checked={config.requireLoginToLaunch}
          onChange={(v) => setConfig((c) => ({ ...c, requireLoginToLaunch: v }))}
        />
        <Toggle
          label="Require login to trade"
          checked={config.requireLoginToTrade}
          onChange={(v) => setConfig((c) => ({ ...c, requireLoginToTrade: v }))}
        />
      </Section>

      {/* Homepage copy */}
      <Section title="Homepage">
        <Field label="Hero title">
          <input
            className={inp}
            value={config.heroTitle}
            onChange={(e) =>
              setConfig((c) => ({ ...c, heroTitle: e.target.value }))
            }
          />
        </Field>
        <Field label="Hero subtitle">
          <textarea
            className={inp}
            rows={2}
            value={config.heroSubtitle}
            onChange={(e) =>
              setConfig((c) => ({ ...c, heroSubtitle: e.target.value }))
            }
          />
        </Field>
        <Field label="Featured section title">
          <input
            className={inp}
            value={config.featuredSectionTitle}
            onChange={(e) =>
              setConfig((c) => ({ ...c, featuredSectionTitle: e.target.value }))
            }
          />
        </Field>
        <Field label="Min liquidity filter (USD)">
          <input
            type="number"
            className={inp}
            value={config.minLiquidityUsd}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                minLiquidityUsd: Number(e.target.value) || 0,
              }))
            }
          />
        </Field>
      </Section>

      {/* Announcement */}
      <Section title="Announcement banner">
        <Toggle
          label="Show banner"
          checked={config.announcement.enabled}
          onChange={(v) =>
            setConfig((c) => ({
              ...c,
              announcement: { ...c.announcement, enabled: v },
            }))
          }
        />
        <Field label="Text">
          <input
            className={inp}
            value={config.announcement.text}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                announcement: { ...c.announcement, text: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Link (optional)">
          <input
            className={inp}
            value={config.announcement.href}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                announcement: { ...c.announcement, href: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Tone">
          <select
            className={inp}
            value={config.announcement.tone}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                announcement: {
                  ...c.announcement,
                  tone: e.target.value as SiteConfig["announcement"]["tone"],
                },
              }))
            }
          >
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="success">success</option>
          </select>
        </Field>
      </Section>

      {/* Featured */}
      <Section title="Featured tokens (homepage top)">
        <div className="space-y-2">
          {config.featured.length === 0 && (
            <p className="text-xs text-white/35">No featured tokens yet.</p>
          )}
          {config.featured.map((f, i) => (
            <div
              key={`${f.address}-${i}`}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
            >
              <span className="font-semibold text-[#00c805]">
                ${f.symbol || "?"}
              </span>
              <code className="text-white/50">{f.address.slice(0, 10)}…</code>
              {f.note && <span className="text-white/40">{f.note}</span>}
              <div className="ml-auto flex gap-1">
                <button type="button" className={btnXs} onClick={() => moveFeatured(i, -1)}>
                  ↑
                </button>
                <button type="button" className={btnXs} onClick={() => moveFeatured(i, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  className={`${btnXs} text-rose-300`}
                  onClick={() => removeFeatured(i)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className={inp}
            placeholder="Token address 0x…"
            value={featDraft.address}
            onChange={(e) =>
              setFeatDraft((d) => ({ ...d, address: e.target.value }))
            }
          />
          <input
            className={inp}
            placeholder="Symbol"
            value={featDraft.symbol}
            onChange={(e) =>
              setFeatDraft((d) => ({ ...d, symbol: e.target.value }))
            }
          />
          <input
            className={inp}
            placeholder="Name"
            value={featDraft.name}
            onChange={(e) =>
              setFeatDraft((d) => ({ ...d, name: e.target.value }))
            }
          />
          <input
            className={inp}
            placeholder="Note (e.g. partner)"
            value={featDraft.note}
            onChange={(e) =>
              setFeatDraft((d) => ({ ...d, note: e.target.value }))
            }
          />
          <input
            className={`${inp} sm:col-span-2`}
            placeholder="Market address (if HoodMemes curve)"
            value={featDraft.market}
            onChange={(e) =>
              setFeatDraft((d) => ({ ...d, market: e.target.value }))
            }
          />
        </div>
        <button type="button" className={`${btnSec} mt-2`} onClick={addFeatured}>
          Add featured
        </button>
      </Section>

      {/* Moderation */}
      <Section title="Moderation">
        <Field label="Hidden token addresses (one per line)">
          <textarea
            className={`${inp} font-mono text-xs`}
            rows={3}
            value={config.hiddenTokens.join("\n")}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                hiddenTokens: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </Field>
        <div className="flex gap-2">
          <input
            className={`${inp} flex-1`}
            placeholder="Quick add hide address"
            value={hideDraft}
            onChange={(e) => setHideDraft(e.target.value)}
          />
          <button
            type="button"
            className={btnSec}
            onClick={() => {
              if (!hideDraft.trim()) return;
              setConfig((c) => ({
                ...c,
                hiddenTokens: [
                  ...c.hiddenTokens,
                  hideDraft.trim().toLowerCase(),
                ],
              }));
              setHideDraft("");
            }}
          >
            Hide
          </button>
        </div>
        <Field label="Blocked creator addresses">
          <textarea
            className={`${inp} font-mono text-xs`}
            rows={2}
            value={config.blockedCreators.join("\n")}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                blockedCreators: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </Field>
        <div className="flex gap-2">
          <input
            className={`${inp} flex-1`}
            placeholder="Block creator 0x…"
            value={blockDraft}
            onChange={(e) => setBlockDraft(e.target.value)}
          />
          <button
            type="button"
            className={btnSec}
            onClick={() => {
              if (!blockDraft.trim()) return;
              setConfig((c) => ({
                ...c,
                blockedCreators: [
                  ...c.blockedCreators,
                  blockDraft.trim().toLowerCase(),
                ],
              }));
              setBlockDraft("");
            }}
          >
            Block
          </button>
        </div>
      </Section>

      {/* Social */}
      <Section title="Social links">
        <Field label="Twitter / X URL">
          <input
            className={inp}
            value={config.social.twitter}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                social: { ...c.social, twitter: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Telegram">
          <input
            className={inp}
            value={config.social.telegram}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                social: { ...c.social, telegram: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Discord">
          <input
            className={inp}
            value={config.social.discord}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                social: { ...c.social, discord: e.target.value },
              }))
            }
          />
        </Field>
      </Section>

      {/* Notes + export */}
      <Section title="Internal notes & export">
        <Field label="Private notes (not shown on site)">
          <textarea
            className={inp}
            rows={3}
            value={config.notes}
            onChange={(e) =>
              setConfig((c) => ({ ...c, notes: e.target.value }))
            }
          />
        </Field>
        <Field label="SITE_CONFIG_JSON (paste into Vercel if no Upstash)">
          <textarea
            className={`${inp} font-mono text-[10px]`}
            rows={6}
            readOnly
            value={JSON.stringify(config)}
            onFocus={(e) => e.target.select()}
          />
        </Field>
        <p className="text-[11px] text-white/35">
          Production tip: free Upstash Redis → set UPSTASH_REDIS_REST_URL +
          UPSTASH_REDIS_REST_TOKEN so Save persists on Vercel. Or paste export
          into SITE_CONFIG_JSON env and redeploy.
        </p>
      </Section>

      <button
        type="button"
        onClick={() => save()}
        disabled={busy}
        className="w-full rounded-xl bg-[#00c805] py-3 text-sm font-bold text-black disabled:opacity-40"
      >
        Save all changes
      </button>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-2 text-sm text-white/80">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#00c805]"
      />
    </label>
  );
}
