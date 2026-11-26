// Docs pages that moved or merged when the docs were reorganized. Published
// links, the markdown urls agents fetch, and MCP page paths keep resolving
// through this map. A destination carries a #fragment when the old page became
// one section of another.
export const MOVED_DOCS_PATHS: ReadonlyArray<readonly [string, string]> = [
  ["/docs/runtimes/concepts/architecture", "/docs/concepts/runtime"],
  ["/docs/runtimes/concepts/threads", "/docs/concepts/threads"],
  ["/docs/runtimes/concepts/adapters", "/docs/concepts/adapters"],
  ["/docs/runtimes/concepts/stability", "/docs/migrations/stability"],
  ["/docs/guides/context-api", "/docs/concepts/context-api"],
  [
    "/docs/runtimes/custom/overview",
    "/docs/runtimes/pick-a-runtime#your-own-backend",
  ],
  ["/docs/runtimes/a2a/quickstart", "/docs/runtimes/a2a/overview"],
  ["/docs/runtimes/ag-ui/quickstart", "/docs/runtimes/ag-ui/overview"],
  [
    "/docs/runtimes/google-adk/quickstart",
    "/docs/runtimes/google-adk/overview",
  ],
  ["/docs/runtimes/opencode/quickstart", "/docs/runtimes/opencode/overview"],
  ["/docs/runtimes/langgraph/quickstart", "/docs/runtimes/langgraph/overview"],
  ["/docs/integrations/frameworks/mastra/overview", "/docs/runtimes/mastra"],
  [
    "/docs/integrations/frameworks/mastra/full-stack",
    "/docs/runtimes/mastra#full-stack",
  ],
  [
    "/docs/integrations/frameworks/mastra/separate-server",
    "/docs/runtimes/mastra#separate-server",
  ],
  ["/docs/integrations/frameworks/mastra", "/docs/runtimes/mastra"],
  [
    "/docs/integrations/frameworks/openai-agents",
    "/docs/runtimes/openai-agents",
  ],
  ["/docs/integrations/frameworks/pydantic-ai", "/docs/runtimes/pydantic-ai"],
  [
    "/docs/integrations/frameworks/cloudflare-agents",
    "/docs/runtimes/cloudflare-agents",
  ],
  ["/docs/integrations/frameworks/ai-sdk", "/docs/runtimes/ai-sdk/overview"],
  ["/docs/cloud/dashboard/overview", "/docs/cloud/dashboard#overview"],
  ["/docs/cloud/dashboard/threads", "/docs/cloud/dashboard#threads"],
  ["/docs/cloud/dashboard/runs", "/docs/cloud/dashboard#runs"],
  ["/docs/cloud/dashboard/models", "/docs/cloud/dashboard#models"],
  ["/docs/cloud/dashboard/users", "/docs/cloud/dashboard#users"],
  ["/docs/cloud/dashboard/engagement", "/docs/cloud/dashboard#engagement"],
  ["/docs/cloud/dashboard/intelligence", "/docs/cloud/dashboard#intelligence"],
  ["/docs/cloud/dashboard/exports", "/docs/cloud/dashboard#exports"],
  ["/docs/cloud/settings/general", "/docs/cloud/settings#general"],
  ["/docs/cloud/settings/telemetry", "/docs/cloud/settings#telemetry"],
  ["/docs/rtl", "/docs/guides/rtl"],
  ["/docs/base-ui", "/docs/guides/base-ui"],
  ["/docs/devtools", "/docs/guides/devtools"],
];

const withoutFragment = (path: string) => path.split("#")[0]!;

// The page an old path moved to, for lookups that skip the HTTP redirects,
// such as the docs MCP server; null for a path that did not move.
export function rewriteMovedDocsPath(path: string): string | null {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  for (const [from, to] of MOVED_DOCS_PATHS) {
    if (normalized === from) return withoutFragment(to);
  }
  return null;
}

// Markdown variants come first so the plain page redirect cannot claim them.
export const MOVED_DOCS_REDIRECTS = MOVED_DOCS_PATHS.flatMap(([from, to]) =>
  [
    { source: `${from}.md`, destination: `${withoutFragment(to)}.md` },
    { source: `${from}.mdx`, destination: `${withoutFragment(to)}.md` },
    { source: from, destination: to },
  ].map((redirect) => ({ ...redirect, permanent: true })),
);
