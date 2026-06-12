import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["ink-web"],
  turbopack: {
    // Pin the workspace root; vercel build's environment makes Turbopack's
    // lockfile-based inference resolve to the app directory instead of the
    // monorepo root, which breaks resolution of pnpm-symlinked packages.
    root: path.join(__dirname, "../.."),
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
