import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep authenticated, admin, and API surface out of search engines.
        disallow: [
          "/admin",
          "/admin/login",
          "/api/",
          "/select",
          "/link-roll",
        ],
      },
    ],
    sitemap: "https://rosterpmc.vercel.app/sitemap.xml",
    host: "https://rosterpmc.vercel.app",
  };
}
