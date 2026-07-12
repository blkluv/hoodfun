import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "hm_admin_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  return (
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "hoodmemes-dev-change-me"
  );
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "hoodmemes-admin";
}

/** Comma-separated admin wallets (lowercase). Default: your deployer. */
export function getAdminWallets(): string[] {
  const raw =
    process.env.ADMIN_WALLETS ||
    "0x426E924063cD9F8B1cd659B0A55639Eaf630A17D";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminWallet(address: string | null | undefined): boolean {
  if (!address) return false;
  return getAdminWallets().includes(address.toLowerCase());
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createAdminToken(): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const body = `ok.${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ok, expStr, sig] = parts;
  if (ok !== "ok") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const body = `${ok}.${expStr}`;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isAdminSession(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(COOKIE)?.value);
}

export function adminCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`;
}

export function clearAdminCookieHeader(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function checkPassword(password: string): boolean {
  const expected = getAdminPassword();
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export { COOKIE as ADMIN_COOKIE_NAME };
