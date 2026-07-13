/**
 * Token logo storage.
 * Priority: Vercel Blob (if BLOB_READ_WRITE_TOKEN) → Upstash → local data/logos.
 * Served at GET /api/logo/[token]
 */

import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "logos");
const REDIS_PREFIX = "hoodmemes:logo:";

export type StoredLogo = {
  contentType: string;
  /** base64 without data: prefix */
  data: string;
  updatedAt: number;
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

function normalizeToken(token: string): string | null {
  const t = token.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(t)) return null;
  return t;
}

/** Max raw base64 payload ~350KB (~260KB binary) */
export const MAX_LOGO_BASE64_CHARS = 350_000;

export async function saveLogo(
  token: string,
  contentType: string,
  base64Data: string
): Promise<{ ok: boolean; url: string; storage: string; error?: string }> {
  const addr = normalizeToken(token);
  if (!addr) {
    return { ok: false, url: "", storage: "none", error: "invalid token" };
  }

  let data = base64Data.trim();
  // strip data URL prefix if present
  const m = data.match(/^data:([^;]+);base64,(.+)$/i);
  let ct = contentType || "image/jpeg";
  if (m) {
    ct = m[1] || ct;
    data = m[2];
  }
  data = data.replace(/\s/g, "");
  if (!data || data.length > MAX_LOGO_BASE64_CHARS) {
    return {
      ok: false,
      url: "",
      storage: "none",
      error: "image too large (max ~250KB compressed)",
    };
  }
  if (!ct.startsWith("image/")) {
    return { ok: false, url: "", storage: "none", error: "not an image" };
  }

  const publicUrl = `/api/logo/${addr}`;
  const record: StoredLogo = {
    contentType: ct,
    data,
    updatedAt: Date.now(),
  };

  // 1) Vercel Blob (optional)
  const blobToken = env("BLOB_READ_WRITE_TOKEN");
  if (blobToken) {
    try {
      const ext = ct.includes("png")
        ? "png"
        : ct.includes("webp")
          ? "webp"
          : "jpg";
      const bin = Buffer.from(data, "base64");
      const res = await fetch(
        `https://blob.vercel-storage.com/token-logos/${addr}.${ext}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${blobToken}`,
            "Content-Type": ct,
            "x-api-version": "7",
            "x-content-type": ct,
          },
          body: bin,
        }
      );
      if (res.ok) {
        const j = (await res.json()) as { url?: string };
        if (j.url) {
          // also stash pointer in upstash/file as URL-only for meta
          await savePointer(addr, j.url, ct);
          return { ok: true, url: j.url, storage: "blob" };
        }
      }
    } catch {
      /* fall through */
    }
  }

  // 2) Upstash
  const c = upstashCreds();
  if (c) {
    try {
      const res = await fetch(c.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "SET",
          REDIS_PREFIX + addr,
          JSON.stringify(record),
        ]),
      });
      if (res.ok) {
        return { ok: true, url: publicUrl, storage: "upstash" };
      }
    } catch {
      /* fall through */
    }
  }

  // 3) Local file
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, `${addr}.json`),
      JSON.stringify(record),
      "utf8"
    );
    return { ok: true, url: publicUrl, storage: "file" };
  } catch (e) {
    return {
      ok: false,
      url: "",
      storage: "none",
      error: e instanceof Error ? e.message : "store failed",
    };
  }
}

async function savePointer(
  addr: string,
  url: string,
  contentType: string
): Promise<void> {
  const pointer = JSON.stringify({
    contentType,
    data: "",
    externalUrl: url,
    updatedAt: Date.now(),
  });
  const c = upstashCreds();
  if (c) {
    try {
      await fetch(c.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["SET", REDIS_PREFIX + addr, pointer]),
      });
      return;
    } catch {
      /* */
    }
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${addr}.json`), pointer, "utf8");
  } catch {
    /* */
  }
}

export async function getLogo(
  token: string
): Promise<
  | { contentType: string; buffer: Buffer }
  | { redirectUrl: string }
  | null
> {
  const addr = normalizeToken(token);
  if (!addr) return null;

  // Upstash
  const c = upstashCreds();
  if (c) {
    try {
      const res = await fetch(c.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["GET", REDIS_PREFIX + addr]),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { result?: string | null };
        if (data.result) {
          const parsed = JSON.parse(data.result) as StoredLogo & {
            externalUrl?: string;
          };
          if (parsed.externalUrl) {
            return { redirectUrl: parsed.externalUrl };
          }
          if (parsed.data) {
            return {
              contentType: parsed.contentType || "image/jpeg",
              buffer: Buffer.from(parsed.data, "base64"),
            };
          }
        }
      }
    } catch {
      /* file */
    }
  }

  // File
  try {
    const raw = await fs.readFile(
      path.join(DATA_DIR, `${addr}.json`),
      "utf8"
    );
    const parsed = JSON.parse(raw) as StoredLogo & { externalUrl?: string };
    if (parsed.externalUrl) return { redirectUrl: parsed.externalUrl };
    if (parsed.data) {
      return {
        contentType: parsed.contentType || "image/jpeg",
        buffer: Buffer.from(parsed.data, "base64"),
      };
    }
  } catch {
    /* */
  }

  return null;
}

export function logoPublicUrl(token: string): string {
  const addr = normalizeToken(token) || token.toLowerCase();
  return `/api/logo/${addr}`;
}
