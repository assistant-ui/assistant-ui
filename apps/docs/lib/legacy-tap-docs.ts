// The Tap and Store docs lived at /tap/docs until they joined the main docs
// tree; published links and MCP resource paths keep resolving through this map.
const LEGACY_TAP_DOCS_PATHS: ReadonlyArray<readonly [string, string]> = [
  ["/tap/docs/overview/introduction", "/docs/tap"],
  ["/tap/docs/overview/motivation", "/docs/tap/motivation"],
  ["/tap/docs/tap", "/docs/tap"],
  ["/tap/docs/store", "/docs/store"],
  ["/tap/docs", "/docs/tap"],
];

export function rewriteLegacyTapDocsPath(path: string): string | null {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  for (const [from, to] of LEGACY_TAP_DOCS_PATHS) {
    if (normalized === from) return to;
    if (normalized.startsWith(`${from}/`)) {
      return `${to}${normalized.slice(from.length)}`;
    }
  }
  return null;
}

// Markdown variants come before the plain wildcard because Next applies the
// first matching redirect and `:path*` would otherwise swallow the suffix.
export const LEGACY_TAP_DOCS_REDIRECTS = LEGACY_TAP_DOCS_PATHS.flatMap(
  ([from, to]) => {
    const isPage = from.includes("/overview/");
    return [
      { source: `${from}.md`, destination: `${to}.md` },
      { source: `${from}.mdx`, destination: `${to}.md` },
      { source: from, destination: to },
      ...(isPage
        ? []
        : [
            { source: `${from}/:path*.md`, destination: `${to}/:path*.md` },
            { source: `${from}/:path*.mdx`, destination: `${to}/:path*.md` },
            { source: `${from}/:path*`, destination: `${to}/:path*` },
          ]),
    ].map((redirect) => ({ ...redirect, permanent: true }));
  },
);
