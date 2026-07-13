/**
 * Admin action log (Upstash / file / memory).
 */

import { promises as fs } from "fs";
import path from "path";

export type AdminActivity = {
  id: string;
  at: number;
  action: string;
  detail?: string;
  actor?: string;
};

const DATA_PATH = path.join(process.cwd(), "data", "admin-activity.json");
const REDIS_KEY = "hoodmemes:admin-activity";
const MAX = 40;

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

const g = globalThis as unknown as { __hoodmemesAdminActivity?: AdminActivity[] };

async function load(): Promise<AdminActivity[]> {
  const c = upstashCreds();
  if (c) {
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
      if (res.ok) {
        const data = (await res.json()) as { result?: string | null };
        if (data.result) {
          const list = JSON.parse(data.result) as AdminActivity[];
          g.__hoodmemesAdminActivity = list;
          return list;
        }
      }
    } catch {
      /* fall through */
    }
  }
  if (g.__hoodmemesAdminActivity) return g.__hoodmemesAdminActivity;
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const list = JSON.parse(raw) as AdminActivity[];
    g.__hoodmemesAdminActivity = list;
    return list;
  } catch {
    return [];
  }
}

async function save(list: AdminActivity[]): Promise<void> {
  g.__hoodmemesAdminActivity = list;
  const c = upstashCreds();
  if (c) {
    try {
      await fetch(c.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["SET", REDIS_KEY, JSON.stringify(list)]),
      });
      return;
    } catch {
      /* file */
    }
  }
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(list, null, 2), "utf8");
  } catch {
    /* memory only */
  }
}

export async function logAdminActivity(
  action: string,
  detail?: string,
  actor?: string
): Promise<void> {
  const list = await load();
  list.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    action,
    detail,
    actor,
  });
  await save(list.slice(0, MAX));
}

export async function getAdminActivity(): Promise<AdminActivity[]> {
  return load();
}
