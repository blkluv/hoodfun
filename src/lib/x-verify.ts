/**
 * Verified launcher registry — wallet ↔ X handle.
 * Proof: EIP-191 signature + public tweet containing the challenge code.
 * Storage: Upstash when available, file fallback locally.
 */

import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

export type VerifiedLauncher = {
  address: string; // lowercase 0x…
  handle: string; // lowercase, no @
  verifiedAt: number;
  tweetUrl: string;
  tweetId: string;
  /** short public code used in tweet */
  code: string;
};

export type PendingChallenge = {
  address: string;
  handle: string;
  code: string;
  message: string;
  tweetText: string;
  createdAt: number;
  expiresAt: number;
};

const VERIFY_DATA = path.join(process.cwd(), "data", "x-verify.json");
const CHALLENGE_DATA = path.join(process.cwd(), "data", "x-challenges.json");
const REDIS_VERIFY = "hoodmemes:x-verify";
const REDIS_CHALLENGE = "hoodmemes:x-challenges";
const CHALLENGE_TTL_MS = 45 * 60 * 1000;

type VerifyMap = Record<string, VerifiedLauncher>; // key = address
type ChallengeMap = Record<string, PendingChallenge>; // key = address

const g = globalThis as unknown as {
  __hoodmemesXVerify?: VerifyMap;
  __hoodmemesXChallenges?: ChallengeMap;
};

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

async function upstashGet<T>(key: string): Promise<T | null> {
  const c = upstashCreds();
  if (!c) return null;
  try {
    const res = await fetch(c.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", key]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    if (!data.result) return null;
    return JSON.parse(data.result) as T;
  } catch {
    return null;
  }
}

async function upstashSet(key: string, value: unknown): Promise<boolean> {
  const c = upstashCreds();
  if (!c) return false;
  try {
    const res = await fetch(c.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", key, JSON.stringify(value)]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fileGet<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function fileSet(filePath: string, value: unknown): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

export function normalizeHandle(raw: string): string | null {
  if (!raw?.trim()) return null;
  let h = raw.trim();
  h = h.replace(/^@/, "");
  h = h.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i, "");
  h = h.split(/[/?#]/)[0] || "";
  h = h.replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) return null;
  return h.toLowerCase();
}

export function profileUrl(handle: string): string {
  return `https://x.com/${handle.replace(/^@/, "")}`;
}

export function buildChallenge(
  address: string,
  handle: string
): PendingChallenge {
  const addr = address.toLowerCase();
  const h = handle.toLowerCase();
  const code = `HM-${randomBytes(4).toString("hex").toUpperCase()}`;
  const message = [
    "HoodMemes launcher verification",
    `Link X @${h} to wallet ${addr}`,
    `Code: ${code}`,
    "Only sign this on hoodmemes.com",
  ].join("\n");

  const shortAddr = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const tweetText = [
    `Verifying my HoodMemes launcher ✅`,
    ``,
    `Wallet: ${addr}`,
    `Code: ${code}`,
    `https://hoodmemes.com`,
    ``,
    `(${shortAddr} · @${h})`,
  ].join("\n");

  const now = Date.now();
  return {
    address: addr,
    handle: h,
    code,
    message,
    tweetText,
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
  };
}

async function loadVerifyMap(): Promise<VerifyMap> {
  const fromRedis = await upstashGet<VerifyMap>(REDIS_VERIFY);
  if (fromRedis) {
    g.__hoodmemesXVerify = fromRedis;
    return fromRedis;
  }
  if (g.__hoodmemesXVerify) return g.__hoodmemesXVerify;
  const fromFile = (await fileGet<VerifyMap>(VERIFY_DATA)) || {};
  g.__hoodmemesXVerify = fromFile;
  return fromFile;
}

async function saveVerifyMap(map: VerifyMap): Promise<boolean> {
  g.__hoodmemesXVerify = map;
  return (await upstashSet(REDIS_VERIFY, map)) || (await fileSet(VERIFY_DATA, map));
}

async function loadChallengeMap(): Promise<ChallengeMap> {
  const fromRedis = await upstashGet<ChallengeMap>(REDIS_CHALLENGE);
  if (fromRedis) {
    g.__hoodmemesXChallenges = fromRedis;
    return fromRedis;
  }
  if (g.__hoodmemesXChallenges) return g.__hoodmemesXChallenges;
  const fromFile = (await fileGet<ChallengeMap>(CHALLENGE_DATA)) || {};
  g.__hoodmemesXChallenges = fromFile;
  return fromFile;
}

async function saveChallengeMap(map: ChallengeMap): Promise<boolean> {
  g.__hoodmemesXChallenges = map;
  // prune expired
  const now = Date.now();
  for (const k of Object.keys(map)) {
    if (map[k].expiresAt < now) delete map[k];
  }
  return (
    (await upstashSet(REDIS_CHALLENGE, map)) ||
    (await fileSet(CHALLENGE_DATA, map))
  );
}

export async function saveChallenge(
  ch: PendingChallenge
): Promise<PendingChallenge> {
  const map = await loadChallengeMap();
  map[ch.address] = ch;
  await saveChallengeMap(map);
  return ch;
}

export async function getChallenge(
  address: string
): Promise<PendingChallenge | null> {
  const map = await loadChallengeMap();
  const ch = map[address.toLowerCase()];
  if (!ch) return null;
  if (ch.expiresAt < Date.now()) {
    delete map[address.toLowerCase()];
    await saveChallengeMap(map);
    return null;
  }
  return ch;
}

export async function clearChallenge(address: string): Promise<void> {
  const map = await loadChallengeMap();
  delete map[address.toLowerCase()];
  await saveChallengeMap(map);
}

export async function getVerifiedByAddress(
  address: string
): Promise<VerifiedLauncher | null> {
  const map = await loadVerifyMap();
  return map[address.toLowerCase()] ?? null;
}

export async function getAllVerified(): Promise<VerifiedLauncher[]> {
  const map = await loadVerifyMap();
  return Object.values(map).sort((a, b) => b.verifiedAt - a.verifiedAt);
}

export async function getVerifiedByHandle(
  handle: string
): Promise<VerifiedLauncher | null> {
  const h = normalizeHandle(handle);
  if (!h) return null;
  const map = await loadVerifyMap();
  return Object.values(map).find((v) => v.handle === h) ?? null;
}

export async function saveVerified(
  entry: VerifiedLauncher
): Promise<{ ok: boolean; entry: VerifiedLauncher }> {
  const map = await loadVerifyMap();
  const addr = entry.address.toLowerCase();
  const handle = entry.handle.toLowerCase();

  // free handle from any other wallet
  for (const [k, v] of Object.entries(map)) {
    if (v.handle === handle && k !== addr) {
      delete map[k];
    }
  }

  const next: VerifiedLauncher = {
    ...entry,
    address: addr,
    handle,
  };
  map[addr] = next;
  const ok = await saveVerifyMap(map);
  return { ok, entry: next };
}

export async function unlinkVerified(address: string): Promise<boolean> {
  const map = await loadVerifyMap();
  const k = address.toLowerCase();
  if (!map[k]) return true;
  delete map[k];
  return saveVerifyMap(map);
}

/** Parse tweet/status id from common X/Twitter URLs */
export function parseTweetId(url: string): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  const m = u.match(
    /(?:twitter\.com|x\.com)\/(?:#!\/)?(?:\w+)\/status(?:es)?\/(\d+)/i
  );
  if (m?.[1]) return m[1];
  // bare numeric id
  if (/^\d{5,25}$/.test(u)) return u;
  return null;
}

/**
 * Fetch public tweet text via free endpoints (no X API keys).
 * Tries fxtwitter → vxtwitter → oEmbed.
 */
export async function fetchTweetText(
  tweetId: string
): Promise<{ text: string; author?: string } | null> {
  const tryJson = async (
    url: string
  ): Promise<{ text: string; author?: string } | null> => {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "HoodMemesBot/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown>;
      // fxtwitter shape
      const tweet = (data.tweet as Record<string, unknown>) || data;
      const text =
        (tweet.text as string) ||
        (tweet.full_text as string) ||
        (data.text as string) ||
        "";
      const author =
        ((tweet.author as { screen_name?: string })?.screen_name as string) ||
        ((tweet.user as { screen_name?: string })?.screen_name as string) ||
        (data.user_screen_name as string) ||
        undefined;
      if (text) return { text, author: author?.toLowerCase() };
      return null;
    } catch {
      return null;
    }
  };

  const fx =
    (await tryJson(`https://api.fxtwitter.com/status/${tweetId}`)) ||
    (await tryJson(`https://api.vxtwitter.com/Twitter/status/${tweetId}`));
  if (fx) return fx;

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(
      `https://x.com/i/status/${tweetId}`
    )}&omit_script=true`;
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "HoodMemesBot/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      html?: string;
      author_name?: string;
      author_url?: string;
    };
    const html = data.html || "";
    // strip tags roughly
    const text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    let author: string | undefined;
    if (data.author_url) {
      const m = data.author_url.match(/(?:twitter|x)\.com\/([^/?#]+)/i);
      if (m?.[1]) author = m[1].toLowerCase();
    }
    if (text) return { text, author };
  } catch {
    /* fall through */
  }

  return null;
}

export function tweetMatchesChallenge(
  tweetText: string,
  challenge: PendingChallenge
): boolean {
  const t = tweetText.toLowerCase();
  const code = challenge.code.toLowerCase();
  const addr = challenge.address.toLowerCase();
  // require code + full address or compact short form used in tweet helper
  const hasCode = t.includes(code);
  const hasAddr =
    t.includes(addr) ||
    t.includes(`${addr.slice(0, 6)}…${addr.slice(-4)}`.toLowerCase()) ||
    t.includes(`${addr.slice(0, 6)}...${addr.slice(-4)}`);
  return hasCode && hasAddr;
}
