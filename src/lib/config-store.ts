import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_SITE_CONFIG,
  normalizeConfig,
  type SiteConfig,
} from "./site-config";

const DATA_PATH = path.join(process.cwd(), "data", "site-config.json");
const REDIS_KEY = "hoodmemes:site-config";

/** Strip quotes/whitespace people paste from .env examples into Vercel */
function env(name: string): string | undefined {
  const v = process.env[name];
  if (v == null || v === "") return undefined;
  let s = v.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

function upstashCreds(): { url: string; token: string } | null {
  const url = env("UPSTASH_REDIS_REST_URL");
  const token = env("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

/** Survives warm serverless instances */
const g = globalThis as unknown as { __hoodmemesConfig?: SiteConfig };
function memGet(): SiteConfig | null {
  return g.__hoodmemesConfig ?? null;
}
function memSet(c: SiteConfig) {
  g.__hoodmemesConfig = c;
}

async function readFileConfig(): Promise<SiteConfig | null> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeFileConfig(config: SiteConfig): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(config, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function upstashCommand(
  command: unknown[]
): Promise<{ ok: boolean; result?: unknown; error?: string; status?: number }> {
  const creds = upstashCreds();
  if (!creds) {
    return { ok: false, error: "UPSTASH env vars missing on this deployment" };
  }
  try {
    const res = await fetch(creds.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    const text = await res.text();
    let data: { result?: unknown; error?: string } = {};
    try {
      data = JSON.parse(text) as { result?: unknown; error?: string };
    } catch {
      return {
        ok: false,
        status: res.status,
        error: `Non-JSON Upstash response: ${text.slice(0, 120)}`,
      };
    }
    if (!res.ok || data.error) {
      return {
        ok: false,
        status: res.status,
        error: data.error || `HTTP ${res.status}`,
      };
    }
    return { ok: true, result: data.result, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upstash fetch failed",
    };
  }
}

async function readUpstash(): Promise<SiteConfig | null> {
  const r = await upstashCommand(["GET", REDIS_KEY]);
  if (!r.ok || r.result == null || r.result === "") return null;
  try {
    const raw =
      typeof r.result === "string" ? r.result : JSON.stringify(r.result);
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeUpstash(
  config: SiteConfig
): Promise<{ ok: boolean; error?: string }> {
  const r = await upstashCommand(["SET", REDIS_KEY, JSON.stringify(config)]);
  if (!r.ok) return { ok: false, error: r.error };
  // result is "OK" on success
  return { ok: true };
}

async function readGitHub(): Promise<SiteConfig | null> {
  const repo = env("GITHUB_REPO") || "danyalsad/hoodfun";
  const branch = env("GITHUB_BRANCH") || "main";
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${repo}/${branch}/data/site-config.json?t=${Date.now()}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return normalizeConfig(await res.json());
  } catch {
    return null;
  }
}

async function writeGitHub(config: SiteConfig): Promise<boolean> {
  const token = env("GITHUB_TOKEN") || env("GH_TOKEN");
  const repo = env("GITHUB_REPO") || "danyalsad/hoodfun";
  const branch = env("GITHUB_BRANCH") || "main";
  const filePath = "data/site-config.json";
  if (!token) return false;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    let sha: string | undefined;
    const getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`,
      { headers, cache: "no-store" }
    );
    if (getRes.ok) {
      const cur = (await getRes.json()) as { sha?: string };
      sha = cur.sha;
    }

    const content = Buffer.from(
      JSON.stringify(config, null, 2),
      "utf8"
    ).toString("base64");
    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `chore(admin): update site config ${new Date().toISOString()}`,
          content,
          branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );
    return putRes.ok;
  } catch {
    return false;
  }
}

function readEnvConfig(): SiteConfig | null {
  const raw = env("SITE_CONFIG_JSON");
  if (!raw) return null;
  try {
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const fromRedis = await readUpstash();
  if (fromRedis) {
    memSet(fromRedis);
    return fromRedis;
  }
  const fromMem = memGet();
  if (fromMem) return fromMem;
  const fromEnv = readEnvConfig();
  if (fromEnv) return fromEnv;
  const fromGh = await readGitHub();
  if (fromGh) return fromGh;
  const fromFile = await readFileConfig();
  if (fromFile) return fromFile;
  return { ...DEFAULT_SITE_CONFIG };
}

export type SaveResult = {
  ok: boolean;
  persistence: "upstash" | "github" | "file" | "memory" | "none";
  config: SiteConfig;
  hint?: string;
  exportJson?: string;
  upstashError?: string;
};

export async function saveSiteConfig(
  partial: Partial<SiteConfig>
): Promise<SaveResult> {
  const current = await getSiteConfig();
  const next = normalizeConfig({
    ...current,
    ...partial,
    announcement: {
      ...current.announcement,
      ...(partial.announcement ?? {}),
    },
    social: { ...current.social, ...(partial.social ?? {}) },
    featured: partial.featured ?? current.featured,
    hiddenTokens: partial.hiddenTokens ?? current.hiddenTokens,
    blockedCreators: partial.blockedCreators ?? current.blockedCreators,
    updatedAt: Date.now(),
  });

  memSet(next);
  const exportJson = JSON.stringify(next);

  const up = await writeUpstash(next);
  if (up.ok) {
    return { ok: true, persistence: "upstash", config: next, exportJson };
  }

  if (await writeGitHub(next)) {
    return {
      ok: true,
      persistence: "github",
      config: next,
      exportJson,
      hint: "Saved to GitHub data/site-config.json.",
      upstashError: up.error,
    };
  }

  if (await writeFileConfig(next)) {
    return {
      ok: true,
      persistence: "file",
      config: next,
      exportJson,
      upstashError: up.error,
    };
  }

  const creds = upstashCreds();
  let hint =
    "Vercel disk is read-only. Config is memory-only until cold start.";
  if (!creds) {
    hint +=
      " UPSTASH env vars are NOT visible on this deployment — remove quotes from values, enable Production, then Redeploy.";
  } else if (up.error) {
    hint += ` Upstash error: ${up.error}`;
  }

  return {
    ok: false,
    persistence: "memory",
    config: next,
    exportJson,
    upstashError: up.error,
    hint,
  };
}

/** Admin diagnostic — no secrets leaked */
export async function diagnosePersistence(): Promise<{
  upstashUrlSet: boolean;
  upstashTokenSet: boolean;
  upstashUrlHost: string | null;
  upstashPing: string;
  githubTokenSet: boolean;
  siteConfigEnvSet: boolean;
}> {
  const creds = upstashCreds();
  let upstashPing = "not configured";
  if (creds) {
    const r = await upstashCommand(["PING"]);
    upstashPing = r.ok ? String(r.result ?? "OK") : `FAIL: ${r.error}`;
  }
  let host: string | null = null;
  try {
    if (creds) host = new URL(creds.url).host;
  } catch {
    host = "invalid-url";
  }
  return {
    upstashUrlSet: Boolean(env("UPSTASH_REDIS_REST_URL")),
    upstashTokenSet: Boolean(env("UPSTASH_REDIS_REST_TOKEN")),
    upstashUrlHost: host,
    upstashPing,
    githubTokenSet: Boolean(env("GITHUB_TOKEN") || env("GH_TOKEN")),
    siteConfigEnvSet: Boolean(env("SITE_CONFIG_JSON")),
  };
}
