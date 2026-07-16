export type AnnouncementTone = "info" | "warn" | "success";

export type FeaturedToken = {
  address: string;
  symbol?: string;
  name?: string;
  note?: string;
  imageUrl?: string;
  market?: string; // bonding market if HoodMemes-native
  order?: number;
};

export type SiteConfig = {
  version: number;
  updatedAt: number;
  heroTitle: string;
  heroSubtitle: string;
  announcement: {
    enabled: boolean;
    text: string;
    href: string;
    tone: AnnouncementTone;
  };
  maintenanceMode: boolean;
  launchesEnabled: boolean;
  tradingEnabled: boolean;
  featuredSectionTitle: string;
  featured: FeaturedToken[];
  hiddenTokens: string[];
  blockedCreators: string[];
  social: {
    twitter: string;
    telegram: string;
    discord: string;
    /** Public contact email shown site-wide */
    email: string;
  };
  minLiquidityUsd: number;
  showDexBoard: boolean;
  requireLoginToTrade: boolean;
  requireLoginToLaunch: boolean;
  notes: string;
  /** Official brand token launch countdown */
  officialLaunch: {
    enabled: boolean;
    /** Unix ms when countdown hits zero */
    at: number;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
  };
};

/**
 * Default: ~24h from ship (2026-07-17 16:00 UTC).
 * Override with NEXT_PUBLIC_OFFICIAL_LAUNCH_AT (ISO) or admin config.
 */
function defaultLaunchAt(): number {
  const env = process.env.NEXT_PUBLIC_OFFICIAL_LAUNCH_AT?.trim();
  if (env) {
    const t = Date.parse(env);
    if (Number.isFinite(t)) return t;
  }
  // ~24h from countdown ship (2026-07-16 ~18:00 UTC)
  return Date.parse("2026-07-17T18:00:00.000Z");
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  version: 1,
  updatedAt: 0,
  heroTitle: "Robinhood trenches",
  heroSubtitle:
    "Live memecoins on Robinhood Chain — launch, trade, and burn on HoodMemes.",
  announcement: {
    enabled: true,
    text: "⏰ Official $HOODMEMES brand token launches in under 24 hours — CA only from @hoodmemesdotfun",
    href: "/#official-launch",
    tone: "success",
  },
  maintenanceMode: false,
  launchesEnabled: true,
  tradingEnabled: true,
  featuredSectionTitle: "Featured",
  featured: [],
  hiddenTokens: [],
  blockedCreators: [],
  social: {
    twitter: "https://x.com/hoodmemesdotfun",
    telegram: "",
    discord: "",
    email: "admin@hoodmemes.fun",
  },
  minLiquidityUsd: 0,
  showDexBoard: true,
  requireLoginToTrade: true,
  requireLoginToLaunch: true,
  notes: "",
  officialLaunch: {
    enabled: true,
    at: defaultLaunchAt(),
    title: "Official $HOODMEMES",
    subtitle:
      "Brand token launch on Robinhood Chain. Countdown is live — CA only from @hoodmemesdotfun.",
    ctaLabel: "Follow on X",
    ctaHref: "https://x.com/hoodmemesdotfun",
  },
};

export function normalizeConfig(raw: Partial<SiteConfig> | null): SiteConfig {
  const base = { ...DEFAULT_SITE_CONFIG, ...(raw ?? {}) };
  base.announcement = {
    ...DEFAULT_SITE_CONFIG.announcement,
    ...(raw?.announcement ?? {}),
  };
  base.social = {
    ...DEFAULT_SITE_CONFIG.social,
    ...(raw?.social ?? {}),
    email:
      (raw?.social as { email?: string } | undefined)?.email ||
      DEFAULT_SITE_CONFIG.social.email,
  };
  const rawLaunch = raw?.officialLaunch as
    | Partial<SiteConfig["officialLaunch"]> & { at?: number | string }
    | undefined;
  base.officialLaunch = {
    ...DEFAULT_SITE_CONFIG.officialLaunch,
    ...(rawLaunch ?? {}),
    at: DEFAULT_SITE_CONFIG.officialLaunch.at,
  };
  if (rawLaunch?.at != null) {
    const t =
      typeof rawLaunch.at === "string"
        ? Date.parse(rawLaunch.at)
        : Number(rawLaunch.at);
    if (Number.isFinite(t)) base.officialLaunch.at = t;
  }
  base.featured = Array.isArray(raw?.featured) ? raw!.featured : [];
  base.hiddenTokens = (raw?.hiddenTokens ?? []).map((a) => a.toLowerCase());
  base.blockedCreators = (raw?.blockedCreators ?? []).map((a) =>
    a.toLowerCase()
  );
  return base as SiteConfig;
}
