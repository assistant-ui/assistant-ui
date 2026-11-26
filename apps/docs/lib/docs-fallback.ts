import { rewriteMovedDocsPath } from "./moved-docs";

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
 * Where a request for the markdown of a /docs path with no page goes instead:
 * the markdown of the page it moved to (lib/moved-docs.ts), else of its
 * folder's overview page. Next.js already redirects the .md urls of moved
 * pages, but a page fetched with `Accept: text/markdown`, or a folder, only
 * reaches the route. `search` carries the platform and view the reader asked
 * for.
 */
export function docsMarkdownRedirect(
  loader: PageLoader<{ url: string }>,
  slug: string[],
  search = "",
): { url: string; permanent: boolean } | null {
  const moved = rewriteMovedDocsPath(["/docs", ...slug].join("/"));
  const target = moved ?? docsOverviewPage(loader, slug)?.url;
  if (!target) return null;
  return {
    url: `${target.split("#")[0]}.md${search ? `?${search}` : ""}`,
    permanent: moved !== null,
  };
}
