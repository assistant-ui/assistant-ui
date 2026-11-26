type PageLoader<Page> = { getPage(slug: string[]): Page | undefined };

/**
 * A docs folder without an index page of its own opens its overview page, so
 * `/docs/runtimes/ag-ui` lands on `/docs/runtimes/ag-ui/overview`. The HTML
 * page, the markdown routes and the MCP server all resolve folders this way.
 */
export function docsOverviewPage<Page>(
  loader: PageLoader<Page>,
  slug: string[],
): Page | undefined {
  return loader.getPage([...slug, "overview"]);
}

/**
 * The markdown url a folder's markdown request goes to: its overview page's.
 * Moved pages never reach the markdown routes, because their redirects in
 * lib/moved-docs.ts run first, for `Accept: text/markdown` requests too.
 * `search` carries the platform and view the reader asked for.
 */
export function docsMarkdownRedirect(
  loader: PageLoader<{ url: string }>,
  slug: string[],
  search = "",
): string | null {
  const overview = docsOverviewPage(loader, slug);
  if (!overview) return null;
  return `${overview.url}.md${search ? `?${search}` : ""}`;
}
