/**
 * Off-chain metadata for token launches (social / authority).
 * Stored in Upstash when available; file fallback locally.
 */

import { promises as fs } from "fs";
import path from "path";

export type LaunchMeta = {
  token: string;
  pair?: string;
  name: string;
  symbol: string;
  description?: string;
  website?: string;
  twitter?: string;
  tweet?: string;
  telegram?: string;
  discord?: string;
  github?: string;
  farcaster?: string;
  creator?: string;
  lpBurned?: boolean;
  lpEth?: string;
  totalSupply?: string;
  /** 0 | 100 | 500 | 1000 — creator allocation at launch */
  creatorBps?: number;
  /** Public logo URL (/api/logo/0x… or external blob) */
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
};

const DATA_PATH = path.join(process.cwd(), "data", "launch-meta.json");
const REDIS_KEY = "hoodmemes:launch-meta";

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

function upstashCreds() {
  const url = env("UPSTASH_REDIS_REST_URL");
  const token = env("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

type MetaMap = Record<string, LaunchMeta>;

const g = globalThis as unknown as { __hoodmemesLaunchMeta?: MetaMap };

async function upstashGet(): Promise<MetaMap | null> {
  const c = upstashCreds();
  if (!c) return null;
  try {
    const res = await fetch(c.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", REDIS_KEY]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    if (!data.result) return null;
    return JSON.parse(data.result) as MetaMap;
  } catch {
    return null;
  }
}

async function upstashSet(map: MetaMap): Promise<boolean> {
  const c = upstashCreds();
  if (!c) return false;
  try {
    const res = await fetch(c.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", REDIS_KEY, JSON.stringify(map)]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fileGet(): Promise<MetaMap> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as MetaMap;
  } catch {
    return {};
  }
}

async function fileSet(map: MetaMap): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(map, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function getAllLaunchMeta(): Promise<MetaMap> {
  const fromRedis = await upstashGet();
  if (fromRedis) {
    g.__hoodmemesLaunchMeta = fromRedis;
    return fromRedis;
  }
  if (g.__hoodmemesLaunchMeta) return g.__hoodmemesLaunchMeta;
  const fromFile = await fileGet();
  g.__hoodmemesLaunchMeta = fromFile;
  return fromFile;
}

export async function getLaunchMeta(
  token: string
): Promise<LaunchMeta | null> {
  const map = await getAllLaunchMeta();
  return map[token.toLowerCase()] ?? null;
}

export async function saveLaunchMeta(
  meta: Omit<LaunchMeta, "updatedAt"> & { updatedAt?: number }
): Promise<{ ok: boolean; meta: LaunchMeta }> {
  const key = meta.token.toLowerCase();
  const map = await getAllLaunchMeta();
  const next: LaunchMeta = {
    ...map[key],
    ...meta,
    token: key,
    createdAt: map[key]?.createdAt ?? meta.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  // normalize empty strings away
  for (const k of Object.keys(next) as (keyof LaunchMeta)[]) {
    if (typeof next[k] === "string" && !(next[k] as string).trim()) {
      delete next[k];
    }
  }
  map[key] = next;
  g.__hoodmemesLaunchMeta = map;
  const ok = (await upstashSet(map)) || (await fileSet(map));
  return { ok, meta: next };
}

export function normalizeUrl(url: string | undefined, kind?: string): string {
  if (!url?.trim()) return "";
  let u = url.trim();
  if (kind === "twitter" || kind === "x") {
    if (u.startsWith("@")) u = `https://x.com/${u.slice(1)}`;
    else if (!/^https?:\/\//i.test(u) && !u.includes("."))
      u = `https://x.com/${u.replace(/^@/, "")}`;
  }
  if (kind === "telegram") {
    if (u.startsWith("@")) u = `https://t.me/${u.slice(1)}`;
    else if (!/^https?:\/\//i.test(u) && !u.includes("."))
      u = `https://t.me/${u.replace(/^@/, "")}`;
  }
  if (!/^https?:\/\//i.test(u) && u.includes(".")) u = `https://${u}`;
  return u;
}
