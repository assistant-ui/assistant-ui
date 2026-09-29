import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";
import { RENDERER_PATH } from "@/lib/renderer";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/api/og",
      disallow: ["/api/", "/playground/init/", RENDERER_PATH],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
