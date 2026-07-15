/**
 * Contact form submissions — Upstash / file / memory.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

export type ContactMessage = {
  id: string;
  at: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  /** optional honeypot / source path */
  source?: string;
  read?: boolean;
};

const DATA_PATH = path.join(process.cwd(), "data", "contacts.json");
const REDIS_KEY = "hoodmemes:contacts";
const MAX = 200;

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

const g = globalThis as unknown as { __hoodmemesContacts?: ContactMessage[] };

async function load(): Promise<ContactMessage[]> {
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
          const list = JSON.parse(data.result) as ContactMessage[];
          g.__hoodmemesContacts = list;
          return list;
        }
      }
    } catch {
      /* */
    }
  }
  if (g.__hoodmemesContacts) return g.__hoodmemesContacts;
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const list = JSON.parse(raw) as ContactMessage[];
    g.__hoodmemesContacts = list;
    return list;
  } catch {
    return [];
  }
}

async function save(list: ContactMessage[]): Promise<void> {
  g.__hoodmemesContacts = list;
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
        cache: "no-store",
      });
    } catch {
      /* */
    }
  }
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(list, null, 2), "utf8");
  } catch {
    /* serverless may be read-only */
  }
}

export async function listContacts(): Promise<ContactMessage[]> {
  return load();
}

export async function addContact(
  input: Omit<ContactMessage, "id" | "at" | "read">
): Promise<ContactMessage> {
  const list = await load();
  const msg: ContactMessage = {
    id: randomBytes(8).toString("hex"),
    at: Date.now(),
    name: input.name.slice(0, 80),
    email: input.email.slice(0, 120),
    subject: input.subject.slice(0, 120),
    message: input.message.slice(0, 4000),
    source: input.source?.slice(0, 80),
    read: false,
  };
  const next = [msg, ...list].slice(0, MAX);
  await save(next);
  return msg;
}

export async function markContactRead(id: string): Promise<boolean> {
  const list = await load();
  const i = list.findIndex((m) => m.id === id);
  if (i < 0) return false;
  list[i] = { ...list[i], read: true };
  await save(list);
  return true;
}
