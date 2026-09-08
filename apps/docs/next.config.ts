import { createMDX } from "fumadocs-mdx/next";
import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";
import {
  AGENT_DISCOVERY_REWRITES,
  API_CATALOG_LINK_HEADER,
} from "./lib/agent-discovery-routes";
import { isWebMcpEnabled } from "./lib/feature-flags";

const isDev = process.env.NODE_ENV === "development";

const apiCatalogDiscoveryPaths = ["/(.*)"];

// The repo source tree is read at runtime through paths the file tracer cannot
// follow, so every route that reaches it has to name it.
const REPO_SOURCE_TRACE = ["./generated/.repo-source/**/*"];

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

// Chrome applies form-action to the redirects that follow a submit, and the
// sign-out form lands on the accounts end-session endpoint.
const authOrigin = process.env.NEXT_PUBLIC_AUTH_URL ?? "";

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
    form-action 'self' ${authOrigin};
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
      "./components/demo/elements/*.tsx",
      "../../packages/ui/src/components/react/assistant-ui/elements/*.tsx",
    ],
    "/api/doc/chat": REPO_SOURCE_TRACE,
    "/api/xulux/chat": REPO_SOURCE_TRACE,
    "/api/xulux/demo-download": REPO_SOURCE_TRACE,
    "/api/xulux/learn/chat": REPO_SOURCE_TRACE,
    "/api/xulux/learn/download": REPO_SOURCE_TRACE,
    "/api/xulux/learn/source": REPO_SOURCE_TRACE,
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
    ...(isWebMcpEnabled
      ? [
          {
            source: "/:path((?!api(?:/|$)|_next(?:/|$)).*)",
            has: [
              {
                type: "header" as const,
                key: "accept",
                value: ".*text/html.*",
              },
            ],
            headers: [
              {
                key: "Origin-Agent-Cluster",
                value: "?1",
              },
              ...(process.env.WEBMCP_ORIGIN_TRIAL_TOKEN
                ? [
                    {
                      key: "Origin-Trial",
                      value: process.env.WEBMCP_ORIGIN_TRIAL_TOKEN,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
    ...apiCatalogDiscoveryPaths.map((source) => ({
      source,
      headers: [{ key: "Link", value: API_CATALOG_LINK_HEADER }],
    })),
  ],
  redirects: async () => [
    {
      source: "/elements/reasoning-panel",
      destination: "/elements/reasoning",
      permanent: true,
    },
    {
      source: "/elements/suggestions",
      destination: "/elements/follow-up-suggestions",
      permanent: true,
    },
    {
      source: "/elements/message-attachment",
      destination: "/elements/attachment",
      permanent: true,
    },
    {
      source: "/elements/quote-reply",
      destination: "/elements/quote",
      permanent: true,
    },
    {
      source: "/elements/timing-footer",
      destination: "/elements/message-timing",
      permanent: true,
    },
    {
      source: "/elements/parallel-tools",
      destination: "/elements/tool-group",
      permanent: true,
    },
    {
      source: "/elements/source-cards",
      destination: "/elements/sources",
      permanent: true,
    },
    {
      source: "/elements/model-picker",
      destination: "/elements/model-selector",
      permanent: true,
    },
    {
      source: "/standalone",
      destination: "/design/components",
      permanent: true,
    },
    {
      source: "/standalone/:slug",
      destination: "/design/components/:slug",
      permanent: true,
    },
    {
      source: "/elements/aui-voice",
      destination: "/elements/orb",
      permanent: true,
    },
    {
      source: "/docs/ui/scrollbar",
      destination: "/docs/guides/scrollbar",
      permanent: true,
    },
    {
      source: "/docs/ui/streamdown",
      destination: "/docs/guides/streamdown",
      permanent: true,
    },
    {
      source: "/docs/ui/part-grouping",
      destination: "/docs/guides/part-grouping",
      permanent: true,
    },
    {
      source: "/docs/ui",
      destination: "/elements",
      permanent: true,
    },
    {
      source: "/docs/ui/thread",
      destination: "/elements/thread",
      permanent: true,
    },
    {
      source: "/docs/ui/context-display",
      destination: "/elements/context-display",
      permanent: true,
    },
    {
      source: "/docs/ui/voice",
      destination: "/elements/orb",
      permanent: true,
    },
    {
      source: "/docs/ui/quote",
      destination: "/elements/quote",
      permanent: true,
    },
    {
      source: "/docs/ui/model-selector",
      destination: "/elements/model-selector",
      permanent: true,
    },
    {
      source: "/docs/ui/composer-trigger-popover",
      destination: "/elements/composer-trigger-popover",
      permanent: true,
    },
    {
      source: "/docs/ui/follow-up-suggestions",
      destination: "/elements/follow-up-suggestions",
      permanent: true,
    },
    {
      source: "/docs/ui/markdown",
      destination: "/elements/markdown-text",
      permanent: true,
    },
    {
      source: "/docs/ui/mermaid",
      destination: "/elements/mermaid-diagram",
      permanent: true,
    },
    {
      source: "/docs/ui/syntax-highlighting",
      destination: "/elements/syntax-highlighter",
      permanent: true,
    },
    {
      source: "/docs/ui/attachment",
      destination: "/elements/attachment",
      permanent: true,
    },
    {
      source: "/docs/ui/tool-fallback",
      destination: "/elements/tool-fallback",
      permanent: true,
    },
    {
      source: "/docs/ui/tool-group",
      destination: "/elements/tool-group",
      permanent: true,
    },
    {
      source: "/docs/ui/sources",
      destination: "/elements/sources",
      permanent: true,
    },
    {
      source: "/docs/ui/reasoning",
      destination: "/elements/reasoning",
      permanent: true,
    },
    {
      source: "/docs/ui/image",
      destination: "/elements/image",
      permanent: true,
    },
    {
      source: "/docs/ui/file",
      destination: "/elements/file",
      permanent: true,
    },
    {
      source: "/docs/ui/directive-text",
      destination: "/elements/directive-text",
      permanent: true,
    },
    {
      source: "/docs/ui/assistant-modal",
      destination: "/elements/assistant-modal",
      permanent: true,
    },
    {
      source: "/docs/ui/assistant-sidebar",
      destination: "/elements/assistant-sidebar",
      permanent: true,
    },
    {
      source: "/docs/ui/message-timing",
      destination: "/elements/message-timing",
      permanent: true,
    },
    {
      source: "/docs/ui/thread-list",
      destination: "/elements/thread-list",
      permanent: true,
    },
    {
      source: "/docs/ui/mcp-config",
      destination: "/elements/mcp-config",
      permanent: true,
    },
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
      destination: "/design/components/:slug",
      permanent: true,
    },
    {
      source: "/docs/standalone",
      destination: "/design/components",
      permanent: true,
    },
    {
      source: "/docs/standalone/:slug",
      destination: "/design/components/:slug",
      permanent: true,
    },
    {
      source: "/docs/api-reference/integrations/react-ai-sdk",
      destination: "/docs/api-reference/integrations/ai-sdk",
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
        source: "/design/:path+.md",
        destination: "/llms.mdx/design/:path*",
      },
      {
        source: "/design/:path+.mdx",
        destination: "/llms.mdx/design/:path*",
      },
      {
        source: "/elements/:path+.md",
        destination: "/llms.mdx/elements/:path*",
      },
      {
        source: "/elements/:path+.mdx",
        destination: "/llms.mdx/elements/:path*",
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
        source: "/design/:path*",
        has: [
          { type: "header", key: "accept", value: "(?:.*text/markdown.*)" },
        ],
        destination: "/llms.mdx/design/:path*",
      },
      {
        source: "/elements/:path*",
        has: [
          { type: "header", key: "accept", value: "(?:.*text/markdown.*)" },
        ],
        destination: "/llms.mdx/elements/:path*",
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
