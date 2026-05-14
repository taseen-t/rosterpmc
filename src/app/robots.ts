import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep admin and internal API surface out of search engines.
        disallow: ["/admin", "/admin/login", "/api/"],
      },
    ],
    sitemap: "https://rosterpmc.vercel.app/sitemap.xml",
    host: "https://rosterpmc.vercel.app",
  };
}
