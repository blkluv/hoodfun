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
};

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  version: 1,
  updatedAt: 0,
  heroTitle: "Robinhood trenches",
  heroSubtitle:
    "Live memecoins on Robinhood Chain — launch, trade, and burn on HoodMemes.",
  announcement: {
    enabled: false,
    text: "",
    href: "",
    tone: "info",
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
  base.featured = Array.isArray(raw?.featured) ? raw!.featured : [];
  base.hiddenTokens = (raw?.hiddenTokens ?? []).map((a) => a.toLowerCase());
  base.blockedCreators = (raw?.blockedCreators ?? []).map((a) =>
    a.toLowerCase()
  );
  return base as SiteConfig;
}
