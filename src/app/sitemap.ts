import type { MetadataRoute } from "next";

const SITE = "https://www.hoodmemes.fun";

/**
 * Public sitemap only — no admin (/hm-ops), account, wallet, or API routes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "hourly", priority: 1 },
    { path: "/create", changeFrequency: "weekly", priority: 0.9 },
    { path: "/bridge", changeFrequency: "weekly", priority: 0.85 },
    { path: "/roadmap", changeFrequency: "weekly", priority: 0.85 },
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.7 },
    { path: "/tokenlist", changeFrequency: "daily", priority: 0.7 },
    { path: "/disclaimer", changeFrequency: "yearly", priority: 0.3 },
  ];

  return pages.map((p) => ({
    url: `${SITE}${p.path === "/" ? "" : p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
