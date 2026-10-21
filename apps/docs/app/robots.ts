import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";
import { EMBEDDED_PATHS } from "@/lib/embedded-paths";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/api/og",
      disallow: ["/api/", "/playground/init/", ...EMBEDDED_PATHS],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
