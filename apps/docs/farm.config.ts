import { defineConfig } from "@farm.js/core";
import { withDocs } from "@farming-labs/farmjs/config";
import tailwindcss from "@tailwindcss/vite";
import { aui } from "@assistant-ui/vite";
import { docsContent } from "./scripts/content/vite-plugin.mts";
import { shipRepoSource } from "./scripts/repo-source-output.mts";
import { tsconfigAliases } from "./scripts/tsconfig-aliases.mts";
import { SETUP_ORIGIN as SETUP_URL } from "./lib/setup-origin.ts";
import {
  AGENT_DISCOVERY_REWRITES,
  API_CATALOG_LINK_HEADER,
} from "./lib/agent-discovery-routes.ts";
import { isWebMcpEnabled } from "./lib/feature-flags.ts";
import { RENDERER_ALLOWED_ORIGINS, RENDERER_PATH } from "./lib/renderer.ts";
import { LEGACY_TAP_DOCS_REDIRECTS } from "./lib/legacy-tap-docs.ts";
import { DOCS_SITE_REDIRECTS } from "./lib/docs-sites.ts";

const isDev = process.env.NODE_ENV === "development";

// The SDK packages resolve to their sources through tsconfig paths, so no
// package build stamps their version; a deployment reports its commit instead.
const sdkVersion = process.env.VERCEL_GIT_COMMIT_SHA
  ? `0.0.0+${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)}`
  : undefined;

// Chrome applies form-action to the redirects that follow a submit, and the
// sign-out form lands on the accounts end-session endpoint.
const authOrigin = process.env.NEXT_PUBLIC_AUTH_URL ?? "";

// The playground AI Builder renders same-origin preview routes inside an iframe.
// Keep frame ancestors self-only so external sites still cannot embed docs pages;
// only the conversation renderer also admits the Assistant Cloud dashboard.
// Cloudflare Web Analytics injects its beacon at the edge, so script-src names
// static.cloudflareinsights.com although nothing in the repo loads it.
const csp = (frameAncestors: string) =>
  `
    default-src 'self';
    connect-src *;
    frame-src * blob:;
    script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://static.cloudflareinsights.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src * blob: data:;
    font-src 'self' https://fonts.gstatic.com data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self' ${authOrigin};
    frame-ancestors ${frameAncestors};
    upgrade-insecure-requests;
`.replace(/\n/g, "");

// Next inlined these at build time in server and client code alike.
const PUBLIC_ENV = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_ASSISTANT_BASE_URL",
  "NEXT_PUBLIC_AUI_AI_PLAYGROUND_ENABLED",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_INK_DEMO_URL",
  "NEXT_PUBLIC_LANGGRAPH_API_URL",
  "NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID",
  "NEXT_PUBLIC_MASTRA_URL",
  "NEXT_PUBLIC_POSTHOG_API_KEY",
  "NEXT_PUBLIC_SETUP_URL",
  "NEXT_PUBLIC_WEBMCP_ENABLED",
  "NEXT_PUBLIC_XULUX_ASSISTANT_BASE_URL",
];
const publicEnv = {
  ...Object.fromEntries(PUBLIC_ENV.map((name) => [name, process.env[name]])),
  NEXT_PUBLIC_VERCEL_ENV:
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV,
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA:
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA,
  // A prerender cannot read the clock, so the copyright year is fixed at build time.
  COPYRIGHT_YEAR: String(new Date().getFullYear()),
};

const permanent = (source: string, destination: string) => ({
  source,
  destination,
  permanent: true,
});

export default withDocs(
  defineConfig({
    srcDir: ".",
    experimental: { serverComponents: true },
    deploy: { target: process.env.VERCEL ? "vercel" : "node" },
    plugins: [shipRepoSource],
    headers: () => [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp("'self'") },
          { key: "Link", value: API_CATALOG_LINK_HEADER },
          ...(isWebMcpEnabled
            ? [{ key: "Origin-Agent-Cluster", value: "?1" }]
            : []),
        ],
      },
      {
        source: RENDERER_PATH,
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp(["'self'", ...RENDERER_ALLOWED_ORIGINS].join(" ")),
          },
        ],
      },
    ],
    redirects: () => [
      ...LEGACY_TAP_DOCS_REDIRECTS,
      ...DOCS_SITE_REDIRECTS,
      // The setup wizard moved to its own app; the fragment an agent link carries survives the redirect.
      {
        source: "/components/setup/:path*",
        destination: `${SETUP_URL}/:path*`,
        permanent: false,
      },
      permanent("/components/cart", "/components"),
      permanent("/getting-started", "/docs/installation"),
      permanent("/tap", "/docs/tap"),
      permanent("/shop/cart.md", "/install.md"),
      permanent("/cloud-ai-sdk", "/docs/cloud/migrate-cloud-ai-sdk"),
      permanent(
        "/docs/api-reference/integrations/cloud-ai-sdk",
        "/docs/cloud/migrate-cloud-ai-sdk",
      ),
      permanent("/docs/cloud/ai-sdk-assistant-ui", "/docs/cloud/ai-sdk"),
      permanent(
        "/docs/integrations/observability/helicone",
        "/docs/integrations",
      ),
      permanent("/docs/cloud/telemetry", "/docs/cloud/run-reports"),
      permanent("/docs/cloud/overview", "/docs/cloud/dashboard/overview"),
      permanent("/docs/cloud/alerts", "/docs/cloud/settings/alerts"),
      permanent("/elements/reasoning-panel", "/elements/reasoning"),
      permanent("/elements/suggestions", "/elements/follow-up-suggestions"),
      permanent("/elements/message-attachment", "/elements/attachment"),
      permanent("/elements/quote-reply", "/elements/quote"),
      permanent("/elements/timing-footer", "/elements/message-timing"),
      permanent("/elements/parallel-tools", "/elements/tool-group"),
      permanent("/elements/source-cards", "/elements/sources"),
      permanent("/elements/model-picker", "/elements/model-selector"),
      permanent("/standalone", "/design/components"),
      permanent("/standalone/:slug", "/design/components/:slug"),
      permanent("/elements/aui-voice", "/elements/orb"),
      permanent("/docs/ui/scrollbar", "/docs/guides/scrollbar"),
      permanent("/docs/ui/streamdown", "/docs/guides/streamdown"),
      permanent("/docs/ui/part-grouping", "/docs/guides/part-grouping"),
      permanent("/docs/ui", "/elements"),
      permanent("/docs/ui/thread", "/elements/thread"),
      permanent("/docs/ui/context-display", "/elements/context-display"),
      permanent("/docs/ui/voice", "/elements/orb"),
      permanent("/docs/ui/quote", "/elements/quote"),
      permanent("/docs/ui/model-selector", "/elements/model-selector"),
      permanent(
        "/docs/ui/composer-trigger-popover",
        "/elements/composer-trigger-popover",
      ),
      permanent(
        "/docs/ui/follow-up-suggestions",
        "/elements/follow-up-suggestions",
      ),
      permanent("/docs/ui/markdown", "/elements/markdown-text"),
      permanent("/docs/ui/mermaid", "/elements/mermaid-diagram"),
      permanent("/docs/ui/syntax-highlighting", "/elements/syntax-highlighter"),
      permanent("/docs/ui/attachment", "/elements/attachment"),
      permanent("/docs/ui/tool-fallback", "/elements/tool-fallback"),
      permanent("/docs/ui/tool-group", "/elements/tool-group"),
      permanent("/docs/ui/sources", "/elements/sources"),
      permanent("/docs/ui/reasoning", "/elements/reasoning"),
      permanent("/docs/ui/image", "/elements/image"),
      permanent("/docs/ui/file", "/elements/file"),
      permanent("/docs/ui/directive-text", "/elements/directive-text"),
      permanent("/docs/ui/assistant-modal", "/elements/assistant-modal"),
      permanent("/docs/ui/assistant-sidebar", "/elements/assistant-sidebar"),
      permanent("/docs/ui/message-timing", "/elements/message-timing"),
      permanent("/docs/ui/thread-list", "/elements/thread-list"),
      permanent("/docs/ui/mcp-config", "/elements/mcp-config"),
      permanent("/docs/runtimes/ai-sdk/v6", "/docs/runtimes/ai-sdk/v6-legacy"),
      permanent(
        "/docs/tools/interactables-legacy",
        "/docs/tools/interactables#migrating-from-the-previous-api",
      ),
      permanent("/gallery", "/elements"),
      permanent("/gallery/components", "/elements/vocabulary"),
      permanent("/gallery/:slug", "/elements/generative-:slug"),
      ...[
        "accordion",
        "badge",
        "diff-viewer",
        "dot-matrix",
        "number-roll",
        "select",
        "tabs",
      ].map((slug) =>
        permanent(`/docs/ui/${slug}`, `/design/components/${slug}`),
      ),
      permanent("/docs/standalone", "/design/components"),
      permanent("/docs/standalone/:slug", "/design/components/:slug"),
      permanent(
        "/docs/api-reference/integrations/react-ai-sdk",
        "/docs/api-reference/integrations/ai-sdk",
      ),
      permanent(
        "/docs/integrations/frameworks/cloudflare-agents/overview",
        "/docs/integrations/frameworks/cloudflare-agents",
      ),
    ],
    // Rewrites run only where no route answers; the .md rewrites that must beat
    // the docs catch-all live in app/middleware.ts.
    rewrites: () => [
      ...AGENT_DISCOVERY_REWRITES,
      { source: "/mcp", destination: "/api/mcp" },
      { source: "/.well-known/mcp", destination: "/api/mcp" },
      { source: "/pricing.mdx", destination: "/pricing.md" },
      {
        source: "/umami/:path*",
        destination: "https://assistant-ui-umami.vercel.app/:path*",
      },
      {
        source: "/ph/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      { source: "/ph/:path*", destination: "https://us.i.posthog.com/:path*" },
      {
        source: "/registry/:path*",
        destination: "https://ui.shadcn.com/registry/:path*",
      },
    ],
    vite: {
      plugins: [tailwindcss(), aui(), docsContent()],
      resolve: { tsconfigPaths: true, alias: tsconfigAliases(process.cwd()) },
      define: {
        ...Object.fromEntries(
          Object.entries(publicEnv).map(([name, value]) => [
            `process.env.${name}`,
            value === undefined ? "undefined" : JSON.stringify(value),
          ]),
        ),
        ...(sdkVersion
          ? { __AUI_PACKAGE_VERSION__: JSON.stringify(sdkVersion) }
          : {}),
      },
      ssr: { external: ["just-bash"] },
    },
  }),
  // The app renders its docs pages and routes; the adapter compiles the MDX.
  { enabled: false },
);
