import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
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
};

export default config;
