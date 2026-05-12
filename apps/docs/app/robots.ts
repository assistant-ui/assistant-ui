import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/playground/init/",
        "/tw-glass/stress-test/",
        "/tw-glass/stress-test-text/",
        "/tw-glass/tuner/",
        "/tw-shimmer/spread-test/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
