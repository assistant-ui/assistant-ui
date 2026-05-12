import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/api/og",
      disallow: ["/api/", "/playground/init/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
