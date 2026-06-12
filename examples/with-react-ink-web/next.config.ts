import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["ink-web"],
  turbopack: {
    resolveAlias: {
      ink: "ink-web",
      "supports-hyperlinks": {
        browser: "./shims/supports-hyperlinks.ts",
      },
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value:
            "frame-ancestors 'self' https://*.assistant-ui.com https://*.vercel.app http://localhost:*;",
        },
      ],
    },
  ],
};

export default config;
