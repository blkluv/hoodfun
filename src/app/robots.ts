import type { MetadataRoute } from "next";

const SITE = "https://www.hoodmemes.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/hm-ops",
          "/hm-ops/",
          "/account",
          "/account/",
          "/wallet",
          "/wallet/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
