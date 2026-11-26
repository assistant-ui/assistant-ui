import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const docsApp = fileURLToPath(new URL("../docs/", import.meta.url));
const docsOrigin =
  process.env["NEXT_PUBLIC_DOCS_ORIGIN"] ?? "http://localhost:3000";

// Assets in the docs site's public folders, which the borrowed sections use.
const docsPublicFolders = readdirSync(`${docsApp}public`).filter((name) =>
  statSync(`${docsApp}public/${name}`).isDirectory(),
);

const config: NextConfig = {
  // The home page's sections and the library's demos come from the docs app, which is built with these on.
  cacheComponents: true,
  transpilePackages: ["@assistant-ui/ui", "shiki"],
  // The root AGENTS.md already points agents at the bundled Next.js docs.
  agentRules: false,
  images: {
    // Local images may live in the docs site's public folder, which is reached through the rewrites below.
    unoptimized: true,
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
  // After this app's own routes and files, the docs dev server answers API
  // calls (sign-in, demo usage, consent) and serves its public assets.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        { source: "/api/:path*", destination: `${docsOrigin}/api/:path*` },
        // Each utility's own docs site lives at /<utility>/docs on the docs server.
        {
          source: "/:project/docs/:path*",
          destination: `${docsOrigin}/:project/docs/:path*`,
        },
        ...docsPublicFolders.map((folder) => ({
          source: `/${folder}/:path*`,
          destination: `${docsOrigin}/${folder}/:path*`,
        })),
      ],
    };
  },
};

// The home demo's toolkit is a "use generative" module, which withAui compiles.
export default withAui(config);
