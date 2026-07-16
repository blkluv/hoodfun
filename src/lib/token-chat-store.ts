/**
 * Per-token community chat — Upstash / file / memory.
 * Public read; posts from wallet-connected users (enforced in API).
 */
import { promises as fs } from "fs";
import path from "path";
import { randomBytes, createHash } from "crypto";

export type ChatMessage = {
  id: string;
  at: number;
  token: string;
  address: string;
  text: string;
  /** display handle if X-verified */
  handle?: string;
};

const DIR = path.join(process.cwd(), "data", "token-chat");
const REDIS_PREFIX = "hoodmemes:token-chat:";
const MAX_PER_TOKEN = 150;
const MAX_TEXT = 280;

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

function normToken(token: string): string {
  return token.trim().toLowerCase();
}

const g = globalThis as unknown as {
  __hoodmemesTokenChat?: Record<string, ChatMessage[]>;
};

function memAll(): Record<string, ChatMessage[]> {
  if (!g.__hoodmemesTokenChat) g.__hoodmemesTokenChat = {};
  return g.__hoodmemesTokenChat;
}

async function load(token: string): Promise<ChatMessage[]> {
  const key = normToken(token);
  const c = upstashCreds();
  if (c) {
    try {
      const res = await fetch(c.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["GET", REDIS_PREFIX + key]),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { result?: string | null };
        if (data.result) {
          const list = JSON.parse(data.result) as ChatMessage[];
          memAll()[key] = list;
          return list;
        }
      }
    } catch {
      /* */
    }
  }
  if (memAll()[key]) return memAll()[key];
  try {
    const raw = await fs.readFile(path.join(DIR, `${key}.json`), "utf8");
    const list = JSON.parse(raw) as ChatMessage[];
    memAll()[key] = list;
    return list;
  } catch {
    return [];
  }
}

async function save(token: string, list: ChatMessage[]): Promise<void> {
  const key = normToken(token);
  memAll()[key] = list;
  const c = upstashCreds();
  if (c) {
    try {
      await fetch(c.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "SET",
          REDIS_PREFIX + key,
          JSON.stringify(list),
        ]),
        cache: "no-store",
      });
    } catch {
      /* */
    }
  }
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(
      path.join(DIR, `${key}.json`),
      JSON.stringify(list, null, 2),
      "utf8"
    );
  } catch {
    /* serverless may be read-only */
  }
}

export async function getChatMessages(
  token: string,
  limit = 80
): Promise<ChatMessage[]> {
  if (!/^0x[a-fA-F0-9]{40}$/i.test(token)) return [];
  const list = await load(token);
  return list.slice(0, Math.min(limit, MAX_PER_TOKEN));
}

export async function postChatMessage(input: {
  token: string;
  address: string;
  text: string;
  handle?: string;
}): Promise<ChatMessage> {
  const token = normToken(input.token);
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
    throw new Error("Invalid token");
  }
  const address = input.address.trim().toLowerCase();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid address");
  }
  let text = input.text.trim().replace(/\s+/g, " ");
  if (text.length < 1 || text.length > MAX_TEXT) {
    throw new Error(`Message must be 1–${MAX_TEXT} characters`);
  }
  // light spam filter
  if (/(https?:\/\/|www\.|t\.me\/|discord\.gg)/i.test(text)) {
    throw new Error("Links are disabled in chat for now (anti-scam)");
  }

  const list = await load(token);
  // rate: same wallet max 1 msg / 8s
  const last = list.find((m) => m.address === address);
  if (last && Date.now() - last.at < 8_000) {
    throw new Error("Slow down — wait a few seconds");
  }

  const msg: ChatMessage = {
    id: randomBytes(6).toString("hex"),
    at: Date.now(),
    token,
    address,
    text,
    handle: input.handle?.replace(/^@/, "").slice(0, 32) || undefined,
  };
  const next = [msg, ...list].slice(0, MAX_PER_TOKEN);
  await save(token, next);
  return msg;
}

/** Optional fingerprint for IP rate limit */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}
