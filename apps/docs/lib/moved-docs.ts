// Docs pages that moved or merged when the docs were reorganized. Published
// links, the markdown urls agents fetch, and MCP page paths keep resolving
// through this map.
export const MOVED_DOCS_PATHS: ReadonlyArray<readonly [string, string]> = [
  ["/docs/runtimes/concepts/architecture", "/docs/concepts/runtime"],
  ["/docs/runtimes/concepts/threads", "/docs/concepts/threads"],
  ["/docs/runtimes/concepts/adapters", "/docs/concepts/adapters"],
  ["/docs/runtimes/concepts/stability", "/docs/migrations/stability"],
  ["/docs/guides/context-api", "/docs/concepts/context-api"],
];

// The page an old path moved to, for lookups that skip the HTTP redirects,
// such as the docs MCP server; null for a path that did not move.
export function rewriteMovedDocsPath(path: string): string | null {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  for (const [from, to] of MOVED_DOCS_PATHS) {
    if (normalized === from) return to;
  }
  return null;
}

// Markdown variants come first so the plain page redirect cannot claim them.
export const MOVED_DOCS_REDIRECTS = MOVED_DOCS_PATHS.flatMap(([from, to]) =>
  [
    { source: `${from}.md`, destination: `${to}.md` },
    { source: `${from}.mdx`, destination: `${to}.md` },
    { source: from, destination: to },
  ].map((redirect) => ({ ...redirect, permanent: true })),
);
