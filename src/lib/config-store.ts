import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_SITE_CONFIG,
  normalizeConfig,
  type SiteConfig,
} from "./site-config";

const DATA_PATH = path.join(process.cwd(), "data", "site-config.json");
const REDIS_KEY = "hoodmemes:site-config";

/** Survives warm serverless instances (helps until Upstash/GitHub is wired) */
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

/** Upstash REST — command array form (reliable for JSON values) */
async function readUpstash(): Promise<SiteConfig | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", REDIS_KEY]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    if (!data.result) return null;
    return normalizeConfig(JSON.parse(data.result));
  } catch {
    return null;
  }
}

async function writeUpstash(config: SiteConfig): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", REDIS_KEY, JSON.stringify(config)]),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { result?: string };
    return data.result === "OK" || res.ok;
  } catch {
    return false;
  }
}

/** Public raw file on GitHub — no token needed for public repos */
async function readGitHub(): Promise<SiteConfig | null> {
  const repo = process.env.GITHUB_REPO || "danyalsad/hoodfun";
  const branch = process.env.GITHUB_BRANCH || "main";
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

/** Commit data/site-config.json via GitHub API (needs GITHUB_TOKEN with repo scope) */
async function writeGitHub(config: SiteConfig): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPO || "danyalsad/hoodfun";
  const branch = process.env.GITHUB_BRANCH || "main";
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

    const content = Buffer.from(JSON.stringify(config, null, 2), "utf8").toString(
      "base64"
    );
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
  const raw = process.env.SITE_CONFIG_JSON;
  if (!raw) return null;
  try {
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Read priority:
 * 1. Upstash (live admin saves)
 * 2. In-memory (warm instance)
 * 3. SITE_CONFIG_JSON env
 * 4. GitHub raw data/site-config.json
 * 5. Local file
 * 6. Defaults
 */
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

  if (await writeUpstash(next)) {
    return {
      ok: true,
      persistence: "upstash",
      config: next,
      exportJson,
    };
  }

  if (await writeGitHub(next)) {
    return {
      ok: true,
      persistence: "github",
      config: next,
      exportJson,
      hint: "Saved to GitHub data/site-config.json. Homepage reads it live from raw.githubusercontent.com.",
    };
  }

  if (await writeFileConfig(next)) {
    return {
      ok: true,
      persistence: "file",
      config: next,
      exportJson,
      hint: "Saved locally. On Vercel add UPSTASH or GITHUB_TOKEN for permanent saves.",
    };
  }

  // Memory only — works until cold start; still return export for Vercel env
  return {
    ok: false,
    persistence: "memory",
    config: next,
    exportJson,
    hint: "Vercel disk is read-only. Config is in memory only until cold start. Fix: (1) free Upstash Redis env vars, or (2) GITHUB_TOKEN with repo write, or (3) paste Export JSON into Vercel env SITE_CONFIG_JSON and redeploy.",
  };
}
