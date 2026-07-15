/**
 * Lightweight first-party analytics — daily buckets in Upstash / file / memory.
 * No cookies, no third-party trackers.
 */
import { promises as fs } from "fs";
import path from "path";

export type DayStats = {
  date: string; // YYYY-MM-DD UTC
  pageviews: number;
  uniqueHints: number; // rough unique via hashed ip+ua buckets
  contacts: number;
  launches: number; // recorded when meta saved / optional event
  events: Record<string, number>;
};

const DATA_PATH = path.join(process.cwd(), "data", "analytics.json");
const REDIS_KEY = "hoodmemes:analytics";
const MAX_DAYS = 90;

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

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

type Store = { days: DayStats[]; uniques: Record<string, string[]> };

const g = globalThis as unknown as { __hoodmemesAnalytics?: Store };

function emptyDay(date: string): DayStats {
  return {
    date,
    pageviews: 0,
    uniqueHints: 0,
    contacts: 0,
    launches: 0,
    events: {},
  };
}

async function load(): Promise<Store> {
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
          const store = JSON.parse(data.result) as Store;
          g.__hoodmemesAnalytics = store;
          return store;
        }
      }
    } catch {
      /* */
    }
  }
  if (g.__hoodmemesAnalytics) return g.__hoodmemesAnalytics;
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const store = JSON.parse(raw) as Store;
    g.__hoodmemesAnalytics = store;
    return store;
  } catch {
    return { days: [], uniques: {} };
  }
}

async function save(store: Store): Promise<void> {
  // trim days
  store.days = store.days
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_DAYS);
  g.__hoodmemesAnalytics = store;
  const c = upstashCreds();
  if (c) {
    try {
      await fetch(c.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["SET", REDIS_KEY, JSON.stringify(store)]),
        cache: "no-store",
      });
    } catch {
      /* */
    }
  }
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    /* */
  }
}

function dayOf(store: Store, date: string): DayStats {
  let d = store.days.find((x) => x.date === date);
  if (!d) {
    d = emptyDay(date);
    store.days.push(d);
  }
  return d;
}

export async function trackEvent(
  name: string,
  opts?: { uniqueKey?: string }
): Promise<void> {
  const store = await load();
  const date = todayUtc();
  const d = dayOf(store, date);

  if (name === "pageview") {
    d.pageviews += 1;
    if (opts?.uniqueKey) {
      const list = store.uniques[date] || [];
      if (!list.includes(opts.uniqueKey) && list.length < 50_000) {
        list.push(opts.uniqueKey);
        store.uniques[date] = list;
        d.uniqueHints = list.length;
      } else {
        d.uniqueHints = list.length;
      }
    }
  } else if (name === "contact") {
    d.contacts += 1;
  } else if (name === "launch") {
    d.launches += 1;
  } else {
    d.events[name] = (d.events[name] || 0) + 1;
  }

  // prune old unique keys
  for (const k of Object.keys(store.uniques)) {
    if (!store.days.some((x) => x.date === k)) delete store.uniques[k];
  }

  await save(store);
}

export async function getAnalyticsSummary(days = 14): Promise<{
  days: DayStats[];
  totals: {
    pageviews: number;
    uniqueHints: number;
    contacts: number;
    launches: number;
  };
  today: DayStats;
}> {
  const store = await load();
  const sorted = [...store.days].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const slice = sorted.slice(0, days);
  const totals = slice.reduce(
    (acc, d) => {
      acc.pageviews += d.pageviews;
      acc.uniqueHints += d.uniqueHints;
      acc.contacts += d.contacts;
      acc.launches += d.launches;
      return acc;
    },
    { pageviews: 0, uniqueHints: 0, contacts: 0, launches: 0 }
  );
  const today = dayOf(store, todayUtc());
  return { days: slice, totals, today };
}
