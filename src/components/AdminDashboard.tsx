"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeaturedToken, SiteConfig } from "@/lib/site-config";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import { useAuth } from "./AuthProvider";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { ROBINHOOD_CHAIN } from "@/lib/chain";
import { shortAddr, timeAgo } from "@/lib/format";
import Link from "next/link";

const inp =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white shadow-inner outline-none transition placeholder:text-white/25 focus:border-[#ccff00]/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#ccff00]/10";
const btnSec =
  "rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white";
const btnXs =
  "rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-[10px] font-semibold text-white/65 transition hover:bg-white/[0.08] hover:text-white";
const btnPrimary =
  "rounded-xl bg-[#ccff00] px-4 py-2 text-sm font-black text-black shadow-[0_0_24px_rgba(204,255,0,0.25)] transition hover:bg-[#e8ff66] hover:shadow-[0_0_32px_rgba(204,255,0,0.35)] disabled:opacity-40";

type TabId =
  | "ops"
  | "analytics"
  | "homepage"
  | "featured"
  | "moderation"
  | "launches"
  | "verify"
  | "social"
  | "system";

const TABS: {
  id: TabId;
  label: string;
  icon: string;
  blurb: string;
  group: "command" | "growth" | "content" | "platform";
}[] = [
  { id: "ops", label: "Command", icon: "◈", blurb: "Status & kill switches", group: "command" },
  { id: "analytics", label: "Analytics", icon: "▣", blurb: "Traffic & inbox", group: "command" },
  { id: "launches", label: "Launches", icon: "◎", blurb: "Token ledger", group: "growth" },
  { id: "featured", label: "Featured", icon: "★", blurb: "Homepage pins", group: "growth" },
  { id: "verify", label: "Identity", icon: "✓", blurb: "Verified launchers", group: "growth" },
  { id: "homepage", label: "Homepage", icon: "▣", blurb: "Hero & banners", group: "content" },
  { id: "moderation", label: "Moderation", icon: "⊘", blurb: "Hide & block", group: "content" },
  { id: "social", label: "Brand", icon: "◌", blurb: "Social & email", group: "content" },
  { id: "system", label: "System", icon: "⚙", blurb: "Factory & health", group: "platform" },
];

type AnalyticsPayload = {
  traffic: {
    days: Array<{
      date: string;
      pageviews: number;
      uniqueHints: number;
      contacts: number;
      launches: number;
    }>;
    totals: {
      pageviews: number;
      uniqueHints: number;
      contacts: number;
      launches: number;
    };
    today: {
      pageviews: number;
      uniqueHints: number;
      contacts: number;
      launches: number;
    };
  };
  launches: {
    total: number;
    v3: number;
    last24h: number;
    last7d: number;
    series: Array<{ date: string; count: number }>;
    topCreators: Array<{ address: string; count: number }>;
    recent: Array<{
      token: string;
      symbol?: string;
      name?: string;
      creator?: string;
      createdAt?: number;
      buyEth?: string;
    }>;
  };
  contacts: {
    total: number;
    unread: number;
    recent: Array<{
      id: string;
      at: number;
      name: string;
      email: string;
      subject: string;
      message: string;
      read?: boolean;
    }>;
  };
  community: { verifiedX: number };
};

const ANN_PRESETS = [
  {
    label: "We’re live",
    text: "HoodMemes is live on Robinhood Chain — launch & trade.",
    tone: "success" as const,
    href: "/create",
  },
  {
    label: "Launches paused",
    text: "Launches temporarily paused. Board still open.",
    tone: "warn" as const,
    href: "/",
  },
  {
    label: "Official token",
    text: "Official token is live — trade on Uniswap.",
    tone: "success" as const,
    href: "/",
  },
];

type LaunchRow = {
  token: string;
  pair?: string;
  name?: string;
  symbol?: string;
  creator?: string;
  creatorBps?: number;
  lpBurned?: boolean;
  lpEth?: string;
  createdAt?: number;
  website?: string;
  twitter?: string;
  telegram?: string;
  description?: string;
};

export function AdminDashboard() {
  const { address, loginWithInjected } = useAuth();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("ops");
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [confirmKill, setConfirmKill] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const [featDraft, setFeatDraft] = useState({
    address: "",
    symbol: "",
    name: "",
    note: "",
    market: "",
    imageUrl: "",
  });
  const [pinCa, setPinCa] = useState("");
  const [hideDraft, setHideDraft] = useState("");
  const [blockDraft, setBlockDraft] = useState("");
  const [bulkHide, setBulkHide] = useState("");
  const [exportJson, setExportJson] = useState("");
  const [copied, setCopied] = useState(false);
  const [diag, setDiag] = useState<Record<string, unknown> | null>(null);
  const [launches, setLaunches] = useState<LaunchRow[]>([]);
  const [launchQ, setLaunchQ] = useState("");
  const [editMeta, setEditMeta] = useState<LaunchRow | null>(null);
  const [verified, setVerified] = useState<
    Array<{ address: string; handle: string; verifiedAt: number }>
  >([]);
  const [activity, setActivity] = useState<
    Array<{ id: string; at: number; action: string; detail?: string }>
  >([]);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const checkSession = useCallback(async () => {
    const res = await fetch("/api/admin/session");
    const data = await res.json();
    setAuthed(!!data.ok);
    if (data.ok) {
      const c = await fetch("/api/admin/config");
      if (c.ok) {
        const j = await c.json();
        setConfig(j.config);
        setLastSaved(j.config?.updatedAt || null);
      }
      loadDiag();
      loadLaunches();
      loadVerified();
      loadActivity();
      loadAnalytics();
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function loadDiag() {
    try {
      const res = await fetch("/api/admin/diagnose");
      if (res.ok) setDiag(await res.json());
    } catch {
      /* */
    }
  }

  async function loadLaunches() {
    try {
      const res = await fetch("/api/admin/launches");
      if (res.ok) {
        const j = await res.json();
        setLaunches(j.launches || []);
      }
    } catch {
      /* */
    }
  }

  async function loadVerified() {
    try {
      const res = await fetch("/api/admin/verify-x");
      if (res.ok) {
        const j = await res.json();
        setVerified(j.items || []);
      }
    } catch {
      /* */
    }
  }

  async function loadActivity() {
    try {
      const res = await fetch("/api/admin/activity");
      if (res.ok) {
        const j = await res.json();
        setActivity(j.items || []);
      }
    } catch {
      /* */
    }
  }

  async function loadAnalytics() {
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) setAnalytics(await res.json());
    } catch {
      /* */
    }
  }

  async function markContactRead(id: string) {
    try {
      await fetch("/api/admin/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadAnalytics();
    } catch {
      /* */
    }
  }

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
      if (data.config) {
        setConfig(data.config);
        setLastSaved(data.config.updatedAt || Date.now());
      }
      const json =
        data.exportJson ||
        (data.config ? JSON.stringify(data.config) : JSON.stringify(body));
      setExportJson(json);
      await loadDiag();
      await loadActivity();
      if (data.ok) {
        setMsg(
          `Saved · ${data.persistence || "ok"}${data.hint ? ` — ${data.hint}` : ""}`
        );
        return;
      }
      const upErr = data.upstashError ? ` Upstash: ${data.upstashError}` : "";
      setErr((data.hint || "Could not persist permanently.") + upErr);
      setMsg("Copy SITE_CONFIG_JSON fallback if needed.");
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

  function downloadExport() {
    const json = exportJson || JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hoodmemes-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SiteConfig;
        setConfig({ ...DEFAULT_SITE_CONFIG, ...parsed });
        setMsg("Imported JSON into editor — click Save all to persist.");
      } catch {
        setErr("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  async function pinOfficial() {
    const ca = pinCa.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(ca)) {
      setErr("Valid token address required");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      let symbol = "TOKEN";
      let name = "Official";
      try {
        const res = await fetch(`/api/tokens?address=${ca}`);
        if (res.ok) {
          const j = await res.json();
          if (j.token) {
            symbol = j.token.symbol || symbol;
            name = j.token.name || name;
          }
        }
      } catch {
        /* */
      }
      try {
        const m = await fetch(`/api/launch-meta?token=${ca}`);
        if (m.ok) {
          const j = await m.json();
          if (j.meta?.symbol) symbol = j.meta.symbol;
          if (j.meta?.name) name = j.meta.name;
        }
      } catch {
        /* */
      }

      let imageUrl: string | undefined;
      try {
        const m = await fetch(`/api/launch-meta?token=${ca}`);
        if (m.ok) {
          const j = await m.json();
          if (j.meta?.imageUrl) imageUrl = j.meta.imageUrl;
          if (j.meta?.symbol) symbol = j.meta.symbol;
          if (j.meta?.name) name = j.meta.name;
        }
      } catch {
        /* */
      }
      if (!imageUrl) {
        imageUrl = `/api/logo/${ca.toLowerCase()}`;
      }

      const featured: FeaturedToken[] = [
        {
          address: ca,
          symbol,
          name,
          note: "Official",
          imageUrl,
          order: 0,
        },
        ...config.featured.filter(
          (f) => f.address.toLowerCase() !== ca.toLowerCase()
        ),
      ];
      const next: SiteConfig = {
        ...config,
        featured,
        featuredSectionTitle: "Official",
        announcement: {
          enabled: true,
          text: `Official $${symbol} is live — trade on Uniswap · ${ca.slice(0, 6)}…${ca.slice(-4)}`,
          href: `/token/${ca}`,
          tone: "success",
        },
      };
      setConfig(next);
      await save(next);
      setPinCa("");
      setMsg(`Pinned $${symbol} as official featured + banner`);
    } finally {
      setBusy(false);
    }
  }

  /** Remove Official pin + banner from homepage (partners stay). */
  async function clearOfficial() {
    if (
      !confirm(
        "Remove the official token from the homepage? Featured partners stay. Announcement banner will be turned off."
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const remaining = config.featured.filter(
        (f) => (f.note || "").toLowerCase() !== "official"
      );
      const next: SiteConfig = {
        ...config,
        featured: remaining,
        featuredSectionTitle:
          remaining.length > 0 ? config.featuredSectionTitle : "Featured",
        announcement: {
          ...config.announcement,
          enabled: false,
          text: "",
          href: "",
        },
      };
      setConfig(next);
      await save(next);
      setMsg(
        remaining.length
          ? "Official pin removed. Other featured tokens kept."
          : "Official pin removed. Homepage featured section is empty."
      );
    } finally {
      setBusy(false);
    }
  }

  /** Remove every featured token + official banner. */
  async function clearAllFeatured() {
    if (!confirm("Clear ALL featured tokens from the homepage?")) return;
    setBusy(true);
    setErr(null);
    try {
      const next: SiteConfig = {
        ...config,
        featured: [],
        featuredSectionTitle: "Featured",
        announcement: {
          ...config.announcement,
          enabled: false,
          text: "",
          href: "",
        },
      };
      setConfig(next);
      await save(next);
      setMsg("All featured tokens cleared from homepage.");
    } finally {
      setBusy(false);
    }
  }

  function addFeatured() {
    if (!featDraft.address.trim()) return;
    const item: FeaturedToken = {
      address: featDraft.address.trim(),
      symbol: featDraft.symbol.trim() || undefined,
      name: featDraft.name.trim() || undefined,
      note: featDraft.note.trim() || undefined,
      market: featDraft.market.trim() || undefined,
      imageUrl: featDraft.imageUrl.trim() || undefined,
      order: config.featured.length,
    };
    setConfig((c) => ({ ...c, featured: [...c.featured, item] }));
    setFeatDraft({
      address: "",
      symbol: "",
      name: "",
      note: "",
      market: "",
      imageUrl: "",
    });
  }

  async function removeFeatured(i: number) {
    const next: SiteConfig = {
      ...config,
      featured: config.featured.filter((_, idx) => idx !== i),
    };
    // If we removed the last Official and none left, soft-reset section title
    const stillOfficial = next.featured.some(
      (f) => (f.note || "").toLowerCase() === "official"
    );
    if (!stillOfficial && next.featuredSectionTitle === "Official") {
      next.featuredSectionTitle = "Featured";
    }
    setConfig(next);
    await save(next);
    setMsg("Removed from homepage featured.");
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

  function hideOne(ca: string) {
    const a = ca.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) return;
    if (config.hiddenTokens.includes(a)) return;
    setConfig((c) => ({
      ...c,
      hiddenTokens: [...c.hiddenTokens, a],
    }));
  }

  function unhide(ca: string) {
    setConfig((c) => ({
      ...c,
      hiddenTokens: c.hiddenTokens.filter((x) => x !== ca.toLowerCase()),
    }));
  }

  function blockOne(ca: string) {
    const a = ca.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) return;
    if (config.blockedCreators.includes(a)) return;
    setConfig((c) => ({
      ...c,
      blockedCreators: [...c.blockedCreators, a],
    }));
  }

  function unblock(ca: string) {
    setConfig((c) => ({
      ...c,
      blockedCreators: c.blockedCreators.filter(
        (x) => x !== ca.toLowerCase()
      ),
    }));
  }

  function applyBulkHide() {
    const lines = bulkHide
      .split(/[\n,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^0x[a-f0-9]{40}$/.test(s));
    if (!lines.length) return;
    setConfig((c) => ({
      ...c,
      hiddenTokens: [...new Set([...c.hiddenTokens, ...lines])],
    }));
    setBulkHide("");
  }

  function applyKill(key: string) {
    if (confirmText !== "CONFIRM") {
      setErr('Type CONFIRM to enable danger switches');
      return;
    }
    if (key === "maintenance") {
      setConfig((c) => ({ ...c, maintenanceMode: true }));
    } else if (key === "launchesOff") {
      setConfig((c) => ({ ...c, launchesEnabled: false }));
    } else if (key === "tradingOff") {
      setConfig((c) => ({ ...c, tradingEnabled: false }));
    }
    setConfirmKill(null);
    setConfirmText("");
    setMsg("Danger switch staged — click Save all");
  }

  async function saveLaunchMeta(row: LaunchRow) {
    setBusy(true);
    try {
      const res = await fetch("/api/launch-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: row.token,
          pair: row.pair,
          name: row.name || "Token",
          symbol: row.symbol || "TOKEN",
          description: row.description,
          website: row.website,
          twitter: row.twitter,
          telegram: row.telegram,
          creator: row.creator,
          lpBurned: row.lpBurned,
          creatorBps: row.creatorBps,
        }),
      });
      if (!res.ok) throw new Error("Save meta failed");
      await fetch("/api/admin/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_launch_meta",
          detail: row.token,
        }),
      });
      setEditMeta(null);
      setMsg("Launch meta saved");
      loadLaunches();
      loadActivity();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "meta failed");
    } finally {
      setBusy(false);
    }
  }

  async function revokeX(addr: string) {
    if (!confirm(`Revoke X verification for ${addr}?`)) return;
    const res = await fetch("/api/admin/verify-x", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addr }),
    });
    if (res.ok) {
      setMsg("Verification revoked");
      loadVerified();
      loadActivity();
    } else {
      setErr("Revoke failed");
    }
  }

  const filteredLaunches = useMemo(() => {
    const q = launchQ.trim().toLowerCase();
    if (!q) return launches;
    return launches.filter(
      (l) =>
        l.token?.toLowerCase().includes(q) ||
        l.symbol?.toLowerCase().includes(q) ||
        l.name?.toLowerCase().includes(q) ||
        l.creator?.toLowerCase().includes(q)
    );
  }, [launches, launchQ]);

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];
  const systemsOk =
    !!diag &&
    (String(diag.upstashPing || "").includes("PONG") ||
      String(diag.upstashPing) === "OK") &&
    !!diag.rpcOk;

  if (!authed) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto bg-[#050607] px-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-[#ccff00]/[0.07] blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(204,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(204,255,0,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
        </div>
        <div className="relative w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ccff00]/30 bg-[#ccff00]/10 text-xl font-black text-[#ccff00] shadow-[0_0_40px_rgba(204,255,0,0.2)]">
              HM
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ccff00]/80">
              HoodMemes · Command Center
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              Secure access
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Production ops console · not indexed · password required
            </p>
          </div>
          <form
            onSubmit={login}
            className="space-y-4 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Admin password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inp}
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
              />
            </label>
            <button
              type="button"
              onClick={() => loginWithInjected().catch(() => {})}
              className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-left text-xs text-white/45 transition hover:border-[#ccff00]/30 hover:text-white/70"
            >
              <span className="text-white/30">Optional wallet · </span>
              {address ? (
                <span className="font-mono text-[#ccff00]">
                  {shortAddr(address, 6)}
                </span>
              ) : (
                "Connect for admin wallet checks"
              )}
            </button>
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-3`}>
              {busy ? "Authenticating…" : "Enter command center"}
            </button>
            {err && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {err}
              </p>
            )}
          </form>
          <p className="mt-6 text-center text-[10px] text-white/25">
            Unauthorized access attempts are not welcome. · hoodmemes.fun
          </p>
        </div>
      </div>
    );
  }

  const groups: Array<{ id: typeof TABS[0]["group"]; label: string }> = [
    { id: "command", label: "Command" },
    { id: "growth", label: "Growth" },
    { id: "content", label: "Content" },
    { id: "platform", label: "Platform" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex bg-[#060708] text-white">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#ccff00]/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#ccff00]/[0.03] blur-[90px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 flex w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0b0d]/95 backdrop-blur-xl">
        <div className="border-b border-white/[0.06] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ccff00] text-sm font-black text-black shadow-[0_0_20px_rgba(204,255,0,0.35)]">
              HM
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-white">
                HoodMemes
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Command Center
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <span
              className={`h-2 w-2 rounded-full ${
                systemsOk
                  ? "bg-[#ccff00] shadow-[0_0_8px_#ccff00]"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-[11px] font-semibold text-white/55">
              {systemsOk ? "All systems nominal" : "Check system health"}
            </span>
          </div>
        </div>

        <nav className="hm-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
                {g.label}
              </div>
              <div className="space-y-0.5">
                {TABS.filter((t) => t.group === g.id).map((t) => {
                  const active = tab === t.id;
                  const badge =
                    t.id === "analytics" && analytics?.contacts.unread
                      ? analytics.contacts.unread
                      : t.id === "launches"
                        ? launches.length || null
                        : null;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.2)]"
                          : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <span
                        className={`text-sm ${active ? "opacity-80" : "opacity-50"}`}
                      >
                        {t.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold leading-tight">
                          {t.label}
                        </span>
                        <span
                          className={`block text-[10px] ${
                            active ? "text-black/55" : "text-white/30"
                          }`}
                        >
                          {t.blurb}
                        </span>
                      </span>
                      {badge != null && badge > 0 && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                            active
                              ? "bg-black/15 text-black"
                              : "bg-white/10 text-white/70"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[10px] text-white/35">
            <div className="font-semibold text-white/50">Session</div>
            <div className="mt-0.5 font-mono">
              {address ? shortAddr(address, 5) : "password only"}
            </div>
            <div className="mt-1">
              config v{config.version || 1}
              {lastSaved
                ? ` · saved ${new Date(lastSaved).toLocaleTimeString()}`
                : ""}
            </div>
          </div>
          <Link
            href="/"
            className="mt-2 block text-center text-[11px] font-semibold text-white/35 hover:text-[#ccff00]"
          >
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0a0b0d]/80 px-6 py-4 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
              <span>Ops</span>
              <span className="text-white/15">/</span>
              <span className="text-[#ccff00]/80">{activeTab.label}</span>
            </div>
            <h1 className="mt-0.5 text-xl font-black tracking-tight text-white">
              {activeTab.label}
            </h1>
            <p className="text-xs text-white/40">{activeTab.blurb}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadAnalytics();
                loadLaunches();
                loadDiag();
                loadActivity();
              }}
              className={btnSec}
            >
              Refresh data
            </button>
            <button
              type="button"
              onClick={() => save()}
              disabled={busy}
              className={btnPrimary}
            >
              {busy ? "Saving…" : "Save all changes"}
            </button>
            <button type="button" onClick={logout} className={btnSec}>
              Logout
            </button>
          </div>
        </header>

        {(msg || err) && (
          <div className="space-y-2 border-b border-white/[0.06] px-6 py-3">
            {msg && (
              <div className="rounded-xl border border-[#ccff00]/25 bg-[#ccff00]/10 px-4 py-2.5 text-xs font-semibold text-[#e8ff99]">
                {msg}
              </div>
            )}
            {err && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-100">
                {err}
              </div>
            )}
          </div>
        )}

        {/* Mobile tab strip */}
        <div className="hm-scroll flex gap-1 overflow-x-auto border-b border-white/[0.06] px-4 py-2 lg:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                tab === t.id
                  ? "bg-[#ccff00] text-black"
                  : "bg-white/[0.04] text-white/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <main className="hm-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-5 pb-20">

      {/* ═══ OPS ═══ */}
      {tab === "ops" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Platform status"
              value={
                config.maintenanceMode
                  ? "Maintenance"
                  : config.launchesEnabled && config.tradingEnabled
                    ? "Live"
                    : "Degraded"
              }
              hint="Public site mode"
              bad={config.maintenanceMode}
              accent={!config.maintenanceMode && config.launchesEnabled}
            />
            <StatCard
              label="Launches"
              value={config.launchesEnabled ? "Open" : "Paused"}
              hint={`${launches.length} in ledger`}
              bad={!config.launchesEnabled}
              accent={config.launchesEnabled}
            />
            <StatCard
              label="Pageviews today"
              value={String(analytics?.traffic.today.pageviews ?? "—")}
              hint={`${analytics?.traffic.today.uniqueHints ?? "—"} uniques est.`}
              accent
            />
            <StatCard
              label="Inbox"
              value={String(analytics?.contacts.unread ?? 0)}
              hint={`${analytics?.contacts.total ?? 0} total messages`}
              bad={(analytics?.contacts.unread ?? 0) > 0}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Trading"
              value={config.tradingEnabled ? "On" : "Off"}
              bad={!config.tradingEnabled}
            />
            <StatCard
              label="Featured slots"
              value={String(config.featured.length)}
            />
            <StatCard
              label="Moderation"
              value={`${config.hiddenTokens.length} / ${config.blockedCreators.length}`}
              hint="Hidden / blocked"
            />
            <StatCard
              label="Infrastructure"
              value={
                diag
                  ? String(diag.upstashPing || "—").includes("PONG") ||
                    String(diag.upstashPing) === "OK"
                    ? "Healthy"
                    : "Check"
                  : "…"
              }
              hint={shortAddr(FACTORY_ADDRESS, 4)}
              bad={
                !!diag &&
                !(
                  String(diag.upstashPing || "").includes("PONG") ||
                  String(diag.upstashPing) === "OK"
                )
              }
              accent={systemsOk}
            />
          </div>

          <Section title="Official / homepage pin">
            <p className="text-[11px] text-white/40">
              Pin sets Featured #1 + announcement. Remove clears only the
              Official pin (partners stay). Clear all wipes the whole featured
              strip.
            </p>
            {config.featured.some(
              (f) => (f.note || "").toLowerCase() === "official"
            ) && (
              <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                Official on homepage:{" "}
                <strong>
                  $
                  {config.featured.find(
                    (f) => (f.note || "").toLowerCase() === "official"
                  )?.symbol || "TOKEN"}
                </strong>{" "}
                <span className="font-mono text-[10px] text-white/50">
                  {
                    config.featured.find(
                      (f) => (f.note || "").toLowerCase() === "official"
                    )?.address
                  }
                </span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={pinCa}
                onChange={(e) => setPinCa(e.target.value)}
                placeholder="0x… token address"
                className={`${inp} max-w-xl font-mono text-xs`}
              />
              <button
                type="button"
                disabled={busy}
                onClick={pinOfficial}
                className="rounded-xl bg-[#ccff00] px-4 py-2 text-sm font-bold text-black"
              >
                Pin official
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={clearOfficial}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-200"
              >
                Remove official
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={clearAllFeatured}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70"
              >
                Clear all featured
              </button>
            </div>
          </Section>

          <Section title="Danger zone">
            <p className="text-[11px] text-rose-200/70">
              Requires typing CONFIRM. Then Save all.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200"
                onClick={() => setConfirmKill("maintenance")}
              >
                Enable maintenance
              </button>
              <button
                type="button"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200"
                onClick={() => setConfirmKill("launchesOff")}
              >
                Pause launches
              </button>
              <button
                type="button"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200"
                onClick={() => setConfirmKill("tradingOff")}
              >
                Disable trading
              </button>
              <button
                type="button"
                className={btnSec}
                onClick={() => {
                  setConfig((c) => ({
                    ...c,
                    maintenanceMode: false,
                    launchesEnabled: true,
                    tradingEnabled: true,
                  }));
                  setMsg("Restored open mode — Save all");
                }}
              >
                Restore all open
              </button>
            </div>
            {confirmKill && (
              <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3">
                <p className="text-xs text-rose-100">
                  Type <strong>CONFIRM</strong> to stage: {confirmKill}
                </p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className={`${inp} mt-2 max-w-xs`}
                  placeholder="CONFIRM"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyKill(confirmKill)}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className={btnXs}
                    onClick={() => {
                      setConfirmKill(null);
                      setConfirmText("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Section>

          <Section title="Kill switches (safe toggles)">
            <Toggle
              label="Show DexScreener board"
              checked={config.showDexBoard}
              onChange={(v) => setConfig((c) => ({ ...c, showDexBoard: v }))}
            />
            <Toggle
              label="Require login to launch"
              checked={config.requireLoginToLaunch}
              onChange={(v) =>
                setConfig((c) => ({ ...c, requireLoginToLaunch: v }))
              }
            />
            <Toggle
              label="Require login to trade"
              checked={config.requireLoginToTrade}
              onChange={(v) =>
                setConfig((c) => ({ ...c, requireLoginToTrade: v }))
              }
            />
            <Toggle
              label="Launches enabled"
              checked={config.launchesEnabled}
              onChange={(v) =>
                setConfig((c) => ({ ...c, launchesEnabled: v }))
              }
            />
            <Toggle
              label="Trading enabled"
              checked={config.tradingEnabled}
              onChange={(v) =>
                setConfig((c) => ({ ...c, tradingEnabled: v }))
              }
            />
            <Toggle
              label="Maintenance mode"
              checked={config.maintenanceMode}
              onChange={(v) =>
                setConfig((c) => ({ ...c, maintenanceMode: v }))
              }
            />
          </Section>

          <Section title="Recent admin activity">
            {activity.length === 0 && (
              <p className="text-xs text-white/35">No actions logged yet.</p>
            )}
            <ul className="space-y-1.5 text-xs text-white/60">
              {activity.slice(0, 15).map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between gap-2 border-b border-white/5 py-1"
                >
                  <span>
                    <strong className="text-white/80">{a.action}</strong>
                    {a.detail ? ` · ${a.detail}` : ""}
                  </span>
                  <span className="shrink-0 text-white/30">
                    {timeAgo(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* ═══ HOMEPAGE ═══ */}
      {tab === "homepage" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Section title="Official launch countdown">
              <Toggle
                label="Show official launch countdown (site-wide)"
                checked={config.officialLaunch?.enabled ?? false}
                onChange={(v) =>
                  setConfig((c) => ({
                    ...c,
                    officialLaunch: {
                      ...c.officialLaunch,
                      enabled: v,
                    },
                  }))
                }
              />
              <Field label="Launch time (local — stored as UTC ms)">
                <input
                  type="datetime-local"
                  className={inp}
                  value={
                    config.officialLaunch?.at
                      ? new Date(config.officialLaunch.at)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) => {
                    const t = new Date(e.target.value).getTime();
                    if (!Number.isFinite(t)) return;
                    setConfig((c) => ({
                      ...c,
                      officialLaunch: {
                        ...c.officialLaunch,
                        at: t,
                      },
                    }));
                  }}
                />
              </Field>
              <Field label="Title">
                <input
                  className={inp}
                  value={config.officialLaunch?.title || ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      officialLaunch: {
                        ...c.officialLaunch,
                        title: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Subtitle">
                <textarea
                  className={`${inp} min-h-[64px]`}
                  value={config.officialLaunch?.subtitle || ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      officialLaunch: {
                        ...c.officialLaunch,
                        subtitle: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="CTA label">
                <input
                  className={inp}
                  value={config.officialLaunch?.ctaLabel || ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      officialLaunch: {
                        ...c.officialLaunch,
                        ctaLabel: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="CTA link (X / token page after launch)">
                <input
                  className={inp}
                  value={config.officialLaunch?.ctaHref || ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      officialLaunch: {
                        ...c.officialLaunch,
                        ctaHref: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <p className="text-[10px] text-white/35">
                After launch: set CTA to token URL, or disable countdown. Or set
                env NEXT_PUBLIC_OFFICIAL_LAUNCH_AT (ISO) on Vercel.
              </p>
            </Section>

            <Section title="Hero copy">
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
                  className={`${inp} min-h-[72px]`}
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
                    setConfig((c) => ({
                      ...c,
                      featuredSectionTitle: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Min liquidity filter (USD) — hide thin pairs on board">
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
              <div className="flex flex-wrap gap-1.5">
                {ANN_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={btnXs}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        announcement: {
                          enabled: true,
                          text: p.text,
                          href: p.href,
                          tone: p.tone,
                        },
                      }))
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Field label="Text">
                <input
                  className={inp}
                  value={config.announcement.text}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      announcement: {
                        ...c.announcement,
                        text: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Link">
                <input
                  className={inp}
                  value={config.announcement.href}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      announcement: {
                        ...c.announcement,
                        href: e.target.value,
                      },
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
          </div>

          <Section title="Live preview">
            <div className="rounded-2xl border border-white/10 bg-[#050806] p-4">
              {config.announcement.enabled && config.announcement.text && (
                <div
                  className={`mb-3 rounded-xl border px-3 py-2 text-xs ${
                    config.announcement.tone === "warn"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                      : config.announcement.tone === "success"
                        ? "border-[#ccff00]/40 bg-[#ccff00]/10 text-[#e8ff99]"
                        : "border-sky-500/30 bg-sky-500/10 text-sky-100"
                  }`}
                >
                  {config.announcement.text}
                </div>
              )}
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#ccff00]">
                Homepage hero
              </div>
              <h2 className="mt-2 text-2xl font-black text-white">
                {config.heroTitle || "—"}
              </h2>
              <p className="mt-1 text-sm text-white/45">
                {config.heroSubtitle || "—"}
              </p>
              {config.featured[0] && (
                <div className="mt-4 rounded-xl border border-[#ccff00]/25 bg-[#ccff00]/5 p-3">
                  <div className="text-[10px] font-bold text-[#ccff00]">
                    {config.featuredSectionTitle}
                  </div>
                  <div className="text-lg font-black text-white">
                    ${config.featured[0].symbol || "TOKEN"}
                  </div>
                  <div className="font-mono text-[10px] text-white/35">
                    {config.featured[0].address}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ═══ FEATURED ═══ */}
      {tab === "featured" && (
        <div className="space-y-4">
          <Section title="Featured tokens (homepage top)">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !config.featured.some(
                  (f) => (f.note || "").toLowerCase() === "official"
                )}
                onClick={clearOfficial}
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200 disabled:opacity-40"
              >
                Remove official
              </button>
              <button
                type="button"
                disabled={busy || config.featured.length === 0}
                onClick={clearAllFeatured}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 disabled:opacity-40"
              >
                Clear all featured
              </button>
            </div>
            {config.featured.length === 0 && (
              <p className="text-xs text-white/35">No featured tokens yet.</p>
            )}
            <div className="space-y-2">
              {config.featured.map((f, i) => (
                <div
                  key={f.address + i}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-black/30 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-white">
                      ${f.symbol || "???"}{" "}
                      <span className="text-sm font-normal text-white/40">
                        {f.name}
                      </span>
                      {(f.note || "").toLowerCase() === "official" && (
                        <span className="ml-2 rounded-full bg-[#ccff00]/20 px-2 py-0.5 text-[10px] font-bold text-[#ccff00]">
                          OFFICIAL
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-[10px] text-white/35">
                      {f.address}
                    </div>
                    {f.note && (
                      <div className="text-[11px] text-white/45">{f.note}</div>
                    )}
                    {f.imageUrl && (
                      <div className="truncate text-[10px] text-white/30">
                        img {f.imageUrl}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={btnXs}
                    onClick={() => moveFeatured(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={btnXs}
                    onClick={() => moveFeatured(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={btnXs}
                    onClick={() => removeFeatured(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Add featured">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Address *">
                <input
                  className={inp}
                  value={featDraft.address}
                  onChange={(e) =>
                    setFeatDraft((d) => ({ ...d, address: e.target.value }))
                  }
                />
              </Field>
              <Field label="Symbol">
                <input
                  className={inp}
                  value={featDraft.symbol}
                  onChange={(e) =>
                    setFeatDraft((d) => ({ ...d, symbol: e.target.value }))
                  }
                />
              </Field>
              <Field label="Name">
                <input
                  className={inp}
                  value={featDraft.name}
                  onChange={(e) =>
                    setFeatDraft((d) => ({ ...d, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Note">
                <input
                  className={inp}
                  value={featDraft.note}
                  onChange={(e) =>
                    setFeatDraft((d) => ({ ...d, note: e.target.value }))
                  }
                />
              </Field>
              <Field label="Image URL">
                <input
                  className={inp}
                  value={featDraft.imageUrl}
                  onChange={(e) =>
                    setFeatDraft((d) => ({ ...d, imageUrl: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </Field>
              <Field label="Market (legacy curve)">
                <input
                  className={inp}
                  value={featDraft.market}
                  onChange={(e) =>
                    setFeatDraft((d) => ({ ...d, market: e.target.value }))
                  }
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={addFeatured}
              className="mt-2 rounded-xl bg-[#ccff00] px-4 py-2 text-sm font-bold text-black"
            >
              Add featured
            </button>
          </Section>
        </div>
      )}

      {/* ═══ MODERATION ═══ */}
      {tab === "moderation" && (
        <div className="space-y-4">
          <Section title="Hide token">
            <div className="flex flex-wrap gap-2">
              <input
                className={`${inp} max-w-md font-mono text-xs`}
                value={hideDraft}
                onChange={(e) => setHideDraft(e.target.value)}
                placeholder="0x… token to hide from board"
              />
              <button
                type="button"
                className="rounded-xl bg-[#ccff00] px-3 py-2 text-xs font-bold text-black"
                onClick={() => {
                  hideOne(hideDraft);
                  setHideDraft("");
                }}
              >
                Hide
              </button>
            </div>
            <ul className="mt-3 space-y-1">
              {config.hiddenTokens.map((a) => (
                <li
                  key={a}
                  className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-2 py-1.5 font-mono text-[11px] text-white/60"
                >
                  <span className="truncate">{a}</span>
                  <button type="button" className={btnXs} onClick={() => unhide(a)}>
                    Unhide
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Bulk hide (paste CAs)">
            <textarea
              className={`${inp} min-h-[80px] font-mono text-xs`}
              value={bulkHide}
              onChange={(e) => setBulkHide(e.target.value)}
              placeholder="0x… one per line"
            />
            <button type="button" className={btnSec} onClick={applyBulkHide}>
              Hide all pasted
            </button>
          </Section>

          <Section title="Block creator wallet">
            <div className="flex flex-wrap gap-2">
              <input
                className={`${inp} max-w-md font-mono text-xs`}
                value={blockDraft}
                onChange={(e) => setBlockDraft(e.target.value)}
                placeholder="0x… creator wallet"
              />
              <button
                type="button"
                className="rounded-xl bg-[#ccff00] px-3 py-2 text-xs font-bold text-black"
                onClick={() => {
                  blockOne(blockDraft);
                  setBlockDraft("");
                }}
              >
                Block
              </button>
            </div>
            <ul className="mt-3 space-y-1">
              {config.blockedCreators.map((a) => (
                <li
                  key={a}
                  className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-2 py-1.5 font-mono text-[11px] text-white/60"
                >
                  <span className="truncate">{a}</span>
                  <button
                    type="button"
                    className={btnXs}
                    onClick={() => unblock(a)}
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* ═══ LAUNCHES ═══ */}
      {tab === "launches" && (
        <div className="space-y-4">
          <Section title="Factory launches">
            <div className="flex flex-wrap gap-2">
              <input
                className={`${inp} max-w-sm`}
                value={launchQ}
                onChange={(e) => setLaunchQ(e.target.value)}
                placeholder="Search CA / symbol / creator"
              />
              <button type="button" className={btnSec} onClick={loadLaunches}>
                Refresh
              </button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-white/35">
                  <tr>
                    <th className="py-2 pr-2">Token</th>
                    <th className="py-2 pr-2">Creator</th>
                    <th className="py-2 pr-2">Alloc</th>
                    <th className="py-2 pr-2">LP</th>
                    <th className="py-2 pr-2">Age</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLaunches.map((l) => (
                    <tr
                      key={l.token}
                      className="border-t border-white/5 text-white/70"
                    >
                      <td className="py-2 pr-2">
                        <div className="font-bold text-white">
                          ${l.symbol || "?"}
                        </div>
                        <div className="font-mono text-[10px] text-white/35">
                          {shortAddr(l.token, 5)}
                        </div>
                      </td>
                      <td className="py-2 pr-2 font-mono text-[10px]">
                        {l.creator ? shortAddr(l.creator, 4) : "—"}
                      </td>
                      <td className="py-2 pr-2">
                        {l.creatorBps != null
                          ? `${l.creatorBps / 100}%`
                          : "—"}
                      </td>
                      <td className="py-2 pr-2">
                        {l.lpBurned ? "Burned" : "Kept"}
                      </td>
                      <td className="py-2 pr-2">
                        {l.createdAt ? timeAgo(l.createdAt) : "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={`/token/${l.token}${l.pair ? `?pair=${l.pair}` : ""}`}
                            className={btnXs}
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            className={btnXs}
                            onClick={() => hideOne(l.token)}
                          >
                            Hide
                          </button>
                          <button
                            type="button"
                            className={btnXs}
                            onClick={() => setEditMeta(l)}
                          >
                            Edit socials
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLaunches.length === 0 && (
                <p className="py-6 text-center text-xs text-white/35">
                  No launches found.
                </p>
              )}
            </div>
          </Section>

          {editMeta && (
            <Section title={`Edit meta · ${editMeta.symbol || editMeta.token}`}>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    className={inp}
                    value={editMeta.name || ""}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Symbol">
                  <input
                    className={inp}
                    value={editMeta.symbol || ""}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, symbol: e.target.value })
                    }
                  />
                </Field>
                <Field label="Description">
                  <input
                    className={inp}
                    value={editMeta.description || ""}
                    onChange={(e) =>
                      setEditMeta({
                        ...editMeta,
                        description: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Website">
                  <input
                    className={inp}
                    value={editMeta.website || ""}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, website: e.target.value })
                    }
                  />
                </Field>
                <Field label="Twitter">
                  <input
                    className={inp}
                    value={editMeta.twitter || ""}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, twitter: e.target.value })
                    }
                  />
                </Field>
                <Field label="Telegram">
                  <input
                    className={inp}
                    value={editMeta.telegram || ""}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, telegram: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveLaunchMeta(editMeta)}
                  className="rounded-xl bg-[#ccff00] px-4 py-2 text-sm font-bold text-black"
                >
                  Save meta
                </button>
                <button
                  type="button"
                  className={btnSec}
                  onClick={() => setEditMeta(null)}
                >
                  Cancel
                </button>
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ═══ VERIFY X ═══ */}
      {tab === "verify" && (
        <Section title="Verified launchers">
          <button type="button" className={btnSec} onClick={loadVerified}>
            Refresh
          </button>
          <ul className="mt-3 space-y-2">
            {verified.length === 0 && (
              <li className="text-xs text-white/35">No verifications yet.</li>
            )}
            {verified.map((v) => (
              <li
                key={v.address}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/30 px-3 py-2"
              >
                <div>
                  <div className="font-bold text-sky-200">@{v.handle}</div>
                  <div className="font-mono text-[10px] text-white/40">
                    {v.address}
                  </div>
                  <div className="text-[10px] text-white/30">
                    {timeAgo(v.verifiedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-rose-500/30 px-2 py-1 text-[10px] font-bold text-rose-200"
                  onClick={() => revokeX(v.address)}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ═══ ANALYTICS ═══ */}
      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/40">
              First-party analytics (no Google). Pageviews + launches + contact
              inbox. Refresh after traffic hits.
            </p>
            <button
              type="button"
              className={btnSec}
              onClick={() => loadAnalytics()}
            >
              Refresh
            </button>
          </div>

          {!analytics ? (
            <p className="text-sm text-white/40">Loading analytics…</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Pageviews today"
                  value={String(analytics.traffic.today.pageviews)}
                />
                <StatCard
                  label="Uniques today (est.)"
                  value={String(analytics.traffic.today.uniqueHints)}
                />
                <StatCard
                  label="PV last 30d"
                  value={String(analytics.traffic.totals.pageviews)}
                />
                <StatCard
                  label="Contacts unread"
                  value={String(analytics.contacts.unread)}
                  bad={analytics.contacts.unread > 0}
                />
                <StatCard
                  label="Launches total"
                  value={String(analytics.launches.total)}
                />
                <StatCard
                  label="Launches 24h"
                  value={String(analytics.launches.last24h)}
                />
                <StatCard
                  label="Launches 7d"
                  value={String(analytics.launches.last7d)}
                />
                <StatCard
                  label="Verified X"
                  value={String(analytics.community.verifiedX)}
                />
              </div>

              <Section title="Traffic (last 14 days)">
                <MiniBars
                  rows={[...analytics.traffic.days]
                    .slice(0, 14)
                    .reverse()
                    .map((d) => ({
                      label: d.date.slice(5),
                      value: d.pageviews,
                    }))}
                />
              </Section>

              <Section title="Launches by day (meta)">
                <MiniBars
                  rows={[...analytics.launches.series]
                    .slice(0, 14)
                    .reverse()
                    .map((d) => ({
                      label: d.date.slice(5),
                      value: d.count,
                    }))}
                />
                {analytics.launches.recent.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-xs">
                    {analytics.launches.recent.map((l) => (
                      <li
                        key={l.token}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/30 px-2.5 py-2"
                      >
                        <Link
                          href={`/token/${l.token}`}
                          className="font-bold text-[#ccff00] hover:underline"
                        >
                          ${l.symbol || "TOKEN"}
                        </Link>
                        <span className="font-mono text-white/35">
                          {l.creator ? shortAddr(l.creator, 4) : "—"}
                        </span>
                        <span className="text-white/30">
                          {l.createdAt ? timeAgo(l.createdAt) : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Top creators">
                {analytics.launches.topCreators.length === 0 ? (
                  <p className="text-xs text-white/40">No launch meta yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {analytics.launches.topCreators.map((c) => (
                      <li
                        key={c.address}
                        className="flex justify-between rounded-lg border border-white/8 bg-black/30 px-2.5 py-2 font-mono"
                      >
                        <span className="text-white/70">
                          {shortAddr(c.address, 6)}
                        </span>
                        <span className="font-bold text-[#ccff00]">
                          {c.count} launches
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Contact inbox">
                <p className="mb-2 text-[11px] text-white/40">
                  Form submissions from /contact. Also receives mail at{" "}
                  <a
                    href="mailto:admin@hoodmemes.fun"
                    className="text-[#ccff00] hover:underline"
                  >
                    admin@hoodmemes.fun
                  </a>{" "}
                  (mailbox is separate — configure DNS/forwarding).
                </p>
                {analytics.contacts.recent.length === 0 ? (
                  <p className="text-xs text-white/40">No messages yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {analytics.contacts.recent.map((m) => (
                      <li
                        key={m.id}
                        className={`rounded-xl border px-3 py-2.5 text-xs ${
                          m.read
                            ? "border-white/8 bg-black/20"
                            : "border-[#ccff00]/25 bg-[#ccff00]/5"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-white">
                              {m.subject}{" "}
                              {!m.read && (
                                <span className="text-[10px] text-[#ccff00]">
                                  NEW
                                </span>
                              )}
                            </div>
                            <div className="text-white/50">
                              {m.name} ·{" "}
                              <a
                                href={`mailto:${m.email}`}
                                className="text-[#ccff00] hover:underline"
                              >
                                {m.email}
                              </a>
                            </div>
                            <div className="mt-1 text-white/30">
                              {timeAgo(m.at)}
                            </div>
                          </div>
                          {!m.read && (
                            <button
                              type="button"
                              className={btnXs}
                              onClick={() => markContactRead(m.id)}
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-white/65">
                          {m.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>
      )}

      {/* ═══ SOCIAL ═══ */}
      {tab === "social" && (
        <Section title="Social links">
          <Field label="Contact email (public)">
            <input
              className={inp}
              value={config.social.email || "admin@hoodmemes.fun"}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  social: { ...c.social, email: e.target.value },
                }))
              }
            />
            <p className="mt-1 text-[10px] text-white/35">
              Shown site-wide. Default: admin@hoodmemes.fun — set up DNS /
              Google Workspace / forwarder so mail actually arrives.
            </p>
          </Field>
          <Field label="X / Twitter URL">
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
      )}

      {/* ═══ SYSTEM ═══ */}
      {tab === "system" && (
        <div className="space-y-4">
          <Section title="Factory & chain">
            <div className="space-y-1 text-xs text-white/70">
              <div>
                Factory:{" "}
                <a
                  className="font-mono text-[#ccff00] hover:underline"
                  href={`${ROBINHOOD_CHAIN.blockExplorers.default.url}/address/${FACTORY_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {FACTORY_ADDRESS}
                </a>
              </div>
              <div>
                Chain: {ROBINHOOD_CHAIN.name} ({ROBINHOOD_CHAIN.id})
              </div>
              <div className="text-white/40">
                Create UI uses this factory. Set{" "}
                <code className="text-white/60">NEXT_PUBLIC_FACTORY_ADDRESS</code>{" "}
                on Vercel after redeploys.
              </div>
            </div>
          </Section>

          <Section title="Diagnostics">
            {diag ? (
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <Check
                  ok={!!diag.upstashUrlSet && !!diag.upstashTokenSet}
                  label="Upstash env"
                />
                <Check
                  ok={
                    String(diag.upstashPing || "").includes("PONG") ||
                    String(diag.upstashPing) === "OK"
                  }
                  label={`Upstash ping: ${String(diag.upstashPing)}`}
                />
                <Check ok={!!diag.rpcOk} label="RPC" />
                <Check ok={!!diag.dexOk} label="DexScreener" />
                <Check
                  ok={!!diag.factoryConfigured}
                  label="Factory configured"
                />
                <Check
                  ok={!diag.defaultPassword}
                  label={
                    diag.defaultPassword
                      ? "ADMIN_PASSWORD still default — change on Vercel"
                      : "Admin password set"
                  }
                />
              </div>
            ) : (
              <p className="text-xs text-white/35">Loading…</p>
            )}
            <button type="button" className={`${btnSec} mt-2`} onClick={loadDiag}>
              Re-check
            </button>
            {diag?.adminWallets ? (
              <p className="mt-2 text-[10px] text-white/35">
                Admin wallets: {(diag.adminWallets as string[]).join(", ")}
              </p>
            ) : null}
          </Section>

          <Section title="Export / import config">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSec} onClick={copyExport}>
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button type="button" className={btnSec} onClick={downloadExport}>
                Download JSON
              </button>
              <button
                type="button"
                className={btnSec}
                onClick={() => fileRef.current?.click()}
              >
                Import JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Field label="SITE_CONFIG_JSON">
              <textarea
                className={`${inp} min-h-[100px] font-mono text-[10px]`}
                value={exportJson || JSON.stringify(config, null, 2)}
                onChange={(e) => setExportJson(e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Internal notes">
            <textarea
              className={`${inp} min-h-[80px]`}
              value={config.notes}
              onChange={(e) =>
                setConfig((c) => ({ ...c, notes: e.target.value }))
              }
              placeholder="Private notes (not public)"
            />
          </Section>
        </div>
      )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015] shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-[13px] font-black tracking-tight text-white">
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-3 px-5 py-4">{children}</div>
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
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
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
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-3 transition hover:border-white/[0.1]">
      <span className="text-sm font-medium text-white/75">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#ccff00]" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-black shadow transition ${
            checked ? "left-[22px] bg-black" : "left-0.5 bg-white/80"
          }`}
        />
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
      </span>
    </label>
  );
}

function StatCard({
  label,
  value,
  bad,
  hint,
  accent,
}: {
  label: string;
  value: string;
  bad?: boolean;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 py-4 ${
        bad
          ? "border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent"
          : accent
            ? "border-[#ccff00]/20 bg-gradient-to-br from-[#ccff00]/[0.08] to-transparent"
            : "border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
        {label}
      </div>
      <div
        className={`mt-1.5 text-2xl font-black tracking-tight tabular-nums ${
          bad ? "text-amber-200" : accent ? "text-[#ccff00]" : "text-white"
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] font-medium text-white/35">{hint}</div>
      )}
    </div>
  );
}

function MiniBars({
  rows,
}: {
  rows: Array<{ label: string; value: number }>;
}) {
  if (!rows.length) {
    return (
      <p className="text-xs text-white/40">No data yet — visit the site.</p>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex h-36 items-end gap-1.5 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-3">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
          title={`${r.label}: ${r.value}`}
        >
          <span className="text-[9px] font-bold tabular-nums text-white/40">
            {r.value || ""}
          </span>
          <div
            className="w-full max-w-[36px] rounded-t-md bg-gradient-to-t from-[#ccff00]/70 to-[#ccff00]"
            style={{ height: `${Math.max(6, (r.value / max) * 96)}px` }}
          />
          <span className="truncate text-[8px] text-white/30">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
        ok
          ? "border-[#ccff00]/20 bg-[#ccff00]/[0.06] text-[#e8ff99]"
          : "border-amber-500/25 bg-amber-500/10 text-amber-100"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${
          ok ? "bg-[#ccff00] text-black" : "bg-amber-400 text-black"
        }`}
      >
        {ok ? "✓" : "!"}
      </span>
      {label}
    </div>
  );
}
