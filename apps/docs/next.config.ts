import { createMDX } from "fumadocs-mdx/next";
import { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@assistant-ui/*", "shiki"],
  serverExternalPackages: ["twoslash"],
  skipTrailingSlashRedirect: true,
  redirects: async () => [
    {
      source: "/docs/getting-started",
      destination: "/docs",
      permanent: true,
    },
    {
      source: "/chatgpt-app-studio",
      destination: "/mcp-app-studio",
      permanent: true,
    },
  ],
  rewrites: async () => ({
    beforeFiles: [
      {
        source: "/umami/:path*",
        destination: "https://assistant-ui-umami.vercel.app/:path*",
      },
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
      {
        source: "/ph/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ph/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ],
    fallback: [
      {
        source: "/registry/:path*",
        destination: "https://ui.shadcn.com/registry/:path*",
      },
    ],
  }),
};

const withMDX = createMDX();

export default withMDX(config);
