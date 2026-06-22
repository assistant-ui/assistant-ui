import { createMDX } from "fumadocs-mdx/next";
import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The playground AI Builder renders same-origin preview routes inside an iframe.
// Keep frame ancestors self-only so external sites still cannot embed docs pages.
const cspHeader = `
    default-src 'self';
    connect-src *;
    frame-src * blob:;
    script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src * blob: data:;
    font-src 'self' https://fonts.gstatic.com data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
`;

const config: NextConfig = {
  transpilePackages: ["@assistant-ui/ui", "shiki"],
  serverExternalPackages: ["just-bash"],
  skipTrailingSlashRedirect: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: cspHeader.replace(/\n/g, ""),
        },
      ],
    },
  ],
  rewrites: async () => ({
    beforeFiles: [
      {
        source: "/mcp",
        destination: "/api/mcp",
      },
      {
        source: "/.well-known/mcp",
        destination: "/api/mcp",
      },
      {
        source: "/docs/mcp",
        destination: "/api/mcp",
      },
      {
        source: "/docs/.well-known/mcp",
        destination: "/api/mcp",
      },
      {
        source: "/docs.md",
        destination: "/llms.mdx",
      },
      {
        source: "/docs.mdx",
        destination: "/llms.mdx",
      },
      {
        source: "/docs/:path*.md",
        destination: "/llms.mdx/:path*",
      },
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
      {
        source: "/examples.md",
        destination: "/llms.mdx/examples",
      },
      {
        source: "/examples.mdx",
        destination: "/llms.mdx/examples",
      },
      {
        source: "/examples/:path*.md",
        destination: "/llms.mdx/examples/:path*",
      },
      {
        source: "/examples/:path*.mdx",
        destination: "/llms.mdx/examples/:path*",
      },
      {
        source: "/tap/docs.md",
        destination: "/tap-llms.mdx",
      },
      {
        source: "/tap/docs.mdx",
        destination: "/tap-llms.mdx",
      },
      {
        source: "/tap/docs/:path*.md",
        destination: "/tap-llms.mdx/:path*",
      },
      {
        source: "/tap/docs/:path*.mdx",
        destination: "/tap-llms.mdx/:path*",
      },
      {
        source: "/",
        has: [
          { type: "header", key: "accept", value: "(?:.*text/markdown.*)" },
        ],
        destination: "/llms.txt",
      },
      {
        source: "/pricing",
        has: [
          { type: "header", key: "accept", value: "(?:.*text/markdown.*)" },
        ],
        destination: "/pricing.md",
      },
      {
        source: "/pricing.mdx",
        destination: "/pricing.md",
      },
      {
        source: "/docs/:path*",
        has: [
          { type: "header", key: "accept", value: "(?:.*text/markdown.*)" },
        ],
        destination: "/llms.mdx/:path*",
      },
      {
        source: "/examples/:path*",
        has: [
          { type: "header", key: "accept", value: "(?:.*text/markdown.*)" },
        ],
        destination: "/llms.mdx/examples/:path*",
      },
      {
        source: "/umami/:path*",
        destination: "https://assistant-ui-umami.vercel.app/:path*",
      },
      {
        source: "/blog/:path.md",
        destination: "/blog/llms.md/:path",
      },
      {
        source: "/blog/:path.mdx",
        destination: "/blog/llms.md/:path",
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

export default withAui(withMDX(config));
