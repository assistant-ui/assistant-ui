import { createMDX } from "fumadocs-mdx/next";
import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";
import {
  AGENT_DISCOVERY_REWRITES,
  API_CATALOG_LINK_HEADER,
} from "./lib/agent-discovery-routes";

const isDev = process.env.NODE_ENV === "development";

const apiCatalogDiscoveryPaths = ["/(.*)"];

const deployEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
const faviconVariant =
  deployEnv === "preview" || deployEnv === "development"
    ? deployEnv
    : undefined;

// Browsers prefer the app-router icon <link> tags (icon.svg, icon0.svg,
// icon1.png) over /favicon.ico, so every icon route must be rewritten for the
// environment favicon to actually show in the tab.
const faviconRewrites = faviconVariant
  ? [
      {
        source: "/favicon.ico",
        destination: `/favicon.${faviconVariant}.ico`,
      },
      {
        source: "/icon.svg",
        destination: `/favicon.${faviconVariant}.svg`,
      },
      {
        source: "/icon0.svg",
        destination: `/favicon.${faviconVariant}.svg`,
      },
      {
        source: "/icon1.png",
        destination: `/favicon.${faviconVariant}.png`,
      },
    ]
  : [];

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
  experimental: {
    // Learn previews compile several complete lesson stages into the docs app.
    // Bound build concurrency so Vercel and other constrained builders do not
    // run out of memory while Turbopack compiles those routes in parallel.
    cpus: 2,
  },
  transpilePackages: ["@assistant-ui/ui", "shiki"],
  serverExternalPackages: ["just-bash"],
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/elements/[slug]": [
      "./components/elements/*.tsx",
      "../../packages/ui/src/components/elements/*.tsx",
    ],
  },
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
    ...apiCatalogDiscoveryPaths.map((source) => ({
      source,
      headers: [{ key: "Link", value: API_CATALOG_LINK_HEADER }],
    })),
  ],
  redirects: async () => [
    {
      source: "/docs/runtimes/ai-sdk/v6",
      destination: "/docs/runtimes/ai-sdk/v6-legacy",
      permanent: true,
    },
    {
      source: "/docs/tools/interactables-legacy",
      destination: "/docs/tools/interactables#migrating-from-the-previous-api",
      permanent: true,
    },
    {
      source: "/gallery",
      destination: "/elements",
      permanent: true,
    },
    {
      source: "/gallery/components",
      destination: "/elements/vocabulary",
      permanent: true,
    },
    {
      source: "/gallery/:slug",
      destination: "/elements/generative-:slug",
      permanent: true,
    },
    {
      source:
        "/docs/ui/:slug(accordion|badge|diff-viewer|dot-matrix|number-roll|select|tabs)",
      destination: "/standalone/:slug",
      permanent: true,
    },
    {
      source: "/docs/standalone",
      destination: "/standalone",
      permanent: true,
    },
    {
      source: "/docs/standalone/:slug",
      destination: "/standalone/:slug",
      permanent: true,
    },
    {
      source: "/docs/integrations/frameworks/cloudflare-agents/overview",
      destination: "/docs/integrations/frameworks/cloudflare-agents",
      permanent: true,
    },
  ],
  rewrites: async () => ({
    beforeFiles: [
      ...faviconRewrites,
      ...AGENT_DISCOVERY_REWRITES,
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
        source: "/standalone.md",
        destination: "/llms.mdx/standalone",
      },
      {
        source: "/standalone.mdx",
        destination: "/llms.mdx/standalone",
      },
      {
        source: "/standalone/:path*.md",
        destination: "/llms.mdx/standalone/:path*",
      },
      {
        source: "/standalone/:path*.mdx",
        destination: "/llms.mdx/standalone/:path*",
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
        source: "/standalone/:path*",
        has: [
          { type: "header", key: "accept", value: "(?:.*text/markdown.*)" },
        ],
        destination: "/llms.mdx/standalone/:path*",
      },
      {
        source: "/tap/docs/:path*",
        has: [
          { type: "header", key: "accept", value: "(?:.*text/markdown.*)" },
        ],
        destination: "/tap-llms.mdx/:path*",
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
