// A sub-project with its own docs site at /<id>/docs, built from
// content/docs-sites/<id>. `legacy` maps a path the site's pages used to live
// at onto its new url, so published links and MCP resource paths keep
// resolving.
export const DOCS_SITES = [
  {
    id: "safe-content-frame",
    title: "Safe Content Frame",
    landing: "/safe-content-frame",
    github:
      "https://github.com/assistant-ui/assistant-ui/tree/main/packages/safe-content-frame",
    legacy: [],
  },
  {
    id: "generative-frame",
    title: "Generative Frame",
    landing: "/generative-frame",
    github:
      "https://github.com/assistant-ui/assistant-ui/tree/main/packages/generative-frame",
    legacy: [],
  },
] as const;

export type DocsSite = (typeof DOCS_SITES)[number];
export type DocsSiteId = DocsSite["id"];

export function getDocsSite(id: string): DocsSite | undefined {
  return DOCS_SITES.find((site) => site.id === id);
}

export function docsSiteBaseUrl(id: DocsSiteId): string {
  return `/${id}/docs`;
}

const LEGACY_DOCS_SITE_PATHS: ReadonlyArray<readonly [string, string]> =
  DOCS_SITES.flatMap((site) => site.legacy);

export function rewriteLegacyDocsSitePath(path: string): string | null {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  for (const [from, to] of LEGACY_DOCS_SITE_PATHS) {
    if (normalized === from) return to;
    if (normalized.startsWith(`${from}/`)) {
      return `${to}${normalized.slice(from.length)}`;
    }
  }
  return null;
}

// Markdown variants come before the plain path because Next applies the first
// matching redirect.
export const DOCS_SITE_REDIRECTS = LEGACY_DOCS_SITE_PATHS.flatMap(
  ([from, to]) =>
    [
      { source: `${from}.md`, destination: `${to}.md` },
      { source: `${from}.mdx`, destination: `${to}.md` },
      { source: from, destination: to },
    ].map((redirect) => ({ ...redirect, permanent: true })),
);

const MARKDOWN_ACCEPT = {
  type: "header" as const,
  key: "accept",
  value: "(?:.*text/markdown.*)",
};

export const docsSiteMarkdownFileRewrites = () =>
  DOCS_SITES.flatMap(({ id }) => {
    const base = docsSiteBaseUrl(id);
    const destination = `/site-llms.mdx/${id}`;
    return [
      { source: `${base}.md`, destination },
      { source: `${base}.mdx`, destination },
      { source: `${base}/:path*.md`, destination: `${destination}/:path*` },
      { source: `${base}/:path*.mdx`, destination: `${destination}/:path*` },
    ];
  });

export const docsSiteMarkdownAcceptRewrites = () =>
  DOCS_SITES.map(({ id }) => ({
    source: `${docsSiteBaseUrl(id)}/:path*`,
    has: [MARKDOWN_ACCEPT],
    destination: `/site-llms.mdx/${id}/:path*`,
  }));
