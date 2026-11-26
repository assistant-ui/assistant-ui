// Docs pages that moved or merged when the docs were reorganized. Published
// links, the markdown urls agents fetch, and MCP page paths keep resolving
// through this map. A destination carries a #fragment when the old page became
// one section of another.
export const MOVED_DOCS_PATHS: ReadonlyArray<readonly [string, string]> = [
  // Older moves.
  [
    "/docs/api-reference/integrations/cloud-ai-sdk",
    "/docs/cloud/migrate-cloud-ai-sdk",
  ],
  [
    "/docs/api-reference/integrations/react-ai-sdk",
    "/docs/api-reference/integrations/ai-sdk",
  ],
  ["/docs/cloud/ai-sdk-assistant-ui", "/docs/cloud/ai-sdk"],
  ["/docs/cloud/overview", "/docs/cloud/dashboard#overview"],
  ["/docs/cloud/telemetry", "/docs/cloud/run-reports"],
  ["/docs/cloud/alerts", "/docs/cloud/settings/alerts"],
  ["/docs/integrations/observability/helicone", "/docs/integrations"],
  ["/docs/runtimes/ai-sdk/v6", "/docs/runtimes/ai-sdk/v6-legacy"],
  [
    "/docs/tools/interactables-legacy",
    "/docs/tools/interactables#migrating-from-the-previous-api",
  ],
  ["/docs/ui/scrollbar", "/docs/guides/scrollbar"],
  ["/docs/ui/streamdown", "/docs/guides/streamdown"],
  ["/docs/ui/part-grouping", "/docs/guides/part-grouping"],
  ["/docs/ui", "/elements"],
  ["/docs/ui/thread", "/elements/thread"],
  ["/docs/ui/context-display", "/elements/context-display"],
  ["/docs/ui/voice", "/elements/orb"],
  ["/docs/ui/quote", "/elements/quote"],
  ["/docs/ui/model-selector", "/elements/model-selector"],
  ["/docs/ui/composer-trigger-popover", "/elements/composer-trigger-popover"],
  ["/docs/ui/follow-up-suggestions", "/elements/follow-up-suggestions"],
  ["/docs/ui/markdown", "/elements/markdown-text"],
  ["/docs/ui/mermaid", "/elements/mermaid-diagram"],
  ["/docs/ui/syntax-highlighting", "/elements/syntax-highlighter"],
  ["/docs/ui/attachment", "/elements/attachment"],
  ["/docs/ui/tool-fallback", "/elements/tool-fallback"],
  ["/docs/ui/tool-group", "/elements/tool-group"],
  ["/docs/ui/sources", "/elements/sources"],
  ["/docs/ui/reasoning", "/elements/reasoning"],
  ["/docs/ui/image", "/elements/image"],
  ["/docs/ui/file", "/elements/file"],
  ["/docs/ui/directive-text", "/elements/directive-text"],
  ["/docs/ui/assistant-modal", "/elements/assistant-modal"],
  ["/docs/ui/assistant-sidebar", "/elements/assistant-sidebar"],
  ["/docs/ui/message-timing", "/elements/message-timing"],
  ["/docs/ui/thread-list", "/elements/thread-list"],
  ["/docs/ui/mcp-config", "/elements/mcp-config"],
  ["/docs/ui/accordion", "/design/components/accordion"],
  ["/docs/ui/badge", "/design/components/badge"],
  ["/docs/ui/diff-viewer", "/design/components/diff-viewer"],
  ["/docs/ui/dot-matrix", "/design/components/dot-matrix"],
  ["/docs/ui/number-roll", "/design/components/number-roll"],
  ["/docs/ui/select", "/design/components/select"],
  ["/docs/ui/tabs", "/design/components/tabs"],
  // Retired urls that coding agents still ask for every day, most likely
  // remembered from older docs (CDN logs, Nov 2026).
  ["/docs/getting-started", "/docs/installation"],
  ["/docs/guides/tool-ui", "/docs/tools/tool-ui"],
  ["/docs/guides/ToolUI", "/docs/tools/tool-ui"],
  ["/docs/guides/tools", "/docs/tools"],
  ["/docs/guides/Tools", "/docs/tools"],
  ["/docs/guides/multi-agent", "/docs/tools/multi-agent"],
  ["/docs/guides/markdown", "/elements/markdown-text"],
  ["/docs/ui/ToolFallback", "/elements/tool-fallback"],
  ["/docs/runtimes/local", "/docs/runtimes/custom/local-runtime"],
  ["/docs/runtimes/custom/local", "/docs/runtimes/custom/local-runtime"],
  [
    "/docs/runtimes/custom/custom-thread-list",
    "/docs/integrations/persistence/thread-list-adapters",
  ],
  ["/docs/runtimes/data-stream", "/docs/runtimes/custom/data-stream"],
  [
    "/docs/runtimes/assistant-transport",
    "/docs/runtimes/custom/assistant-transport",
  ],
  ["/docs/runtimes/ai-sdk/use-chat", "/docs/runtimes/ai-sdk/overview"],
  // Reorganization moves.
  ["/docs/runtimes/custom", "/docs/runtimes/pick-a-runtime#your-own-backend"],
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
  [
    "/docs/integrations/frameworks/cloudflare-agents/overview",
    "/docs/runtimes/cloudflare-agents",
  ],
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
