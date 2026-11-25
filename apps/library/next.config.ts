import type { NextConfig } from "next";

const config: NextConfig = {
  // The element demos come from the docs app, which is built with these on.
  cacheComponents: true,
  transpilePackages: ["@assistant-ui/ui", "shiki"],
  // The root AGENTS.md already points agents at the bundled Next.js docs.
  agentRules: false,
  // Block screenshots and the one image icon are the ones the docs site serves.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.assistant-ui.com",
        pathname: "/screenshot/**",
      },
      {
        protocol: "https",
        hostname: "www.assistant-ui.com",
        pathname: "/icons/**",
      },
    ],
  },
  skipTrailingSlashRedirect: true,
};

export default config;
