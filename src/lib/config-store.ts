import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_SITE_CONFIG,
  normalizeConfig,
  type SiteConfig,
} from "./site-config";

const DATA_PATH = path.join(process.cwd(), "data", "site-config.json");

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

async function readUpstash(): Promise<SiteConfig | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/hoodmemes:site-config`, {
      headers: { Authorization: `Bearer ${token}` },
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
    const res = await fetch(`${url}/set/hoodmemes:site-config`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(config)),
    });
    return res.ok;
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

/** Public read: Upstash → env override → file → default */
export async function getSiteConfig(): Promise<SiteConfig> {
  const fromRedis = await readUpstash();
  if (fromRedis) return fromRedis;
  const fromEnv = readEnvConfig();
  if (fromEnv) return fromEnv;
  const fromFile = await readFileConfig();
  if (fromFile) return fromFile;
  return { ...DEFAULT_SITE_CONFIG };
}

export type SaveResult = {
  ok: boolean;
  persistence: "upstash" | "file" | "none";
  config: SiteConfig;
  hint?: string;
};

/** Admin write: prefer Upstash, else file (local). Always returns JSON for Vercel env fallback. */
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
    updatedAt: Date.now(),
  });

  if (await writeUpstash(next)) {
    return { ok: true, persistence: "upstash", config: next };
  }
  if (await writeFileConfig(next)) {
    return {
      ok: true,
      persistence: "file",
      config: next,
      hint: "Saved to data/site-config.json (local). On Vercel, set UPSTASH_REDIS_REST_* or paste SITE_CONFIG_JSON from export.",
    };
  }
  return {
    ok: false,
    persistence: "none",
    config: next,
    hint: "Could not persist. Copy SITE_CONFIG_JSON from Export into Vercel env, or add free Upstash Redis.",
  };
}
