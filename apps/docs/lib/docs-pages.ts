import { docsSiteSources, source, type DocsSitePage } from "@/lib/source";
import type { InferPageType } from "fumadocs-core/source";
import {
  DOCS_SITES,
  docsSiteBaseUrl,
  rewriteLegacyDocsSitePath,
  type DocsSite,
} from "@/lib/docs-sites";

export type DocsPage = InferPageType<typeof source> | DocsSitePage;

// Every documentation page: the main /docs tree followed by each
// sub-project docs site, in registry order.
export function allDocsPages(): DocsPage[] {
  return [
    ...source.getPages(),
    ...DOCS_SITES.flatMap((site) => docsSiteSources[site.id].getPages()),
  ];
}

// The pages of each sub-project docs site, grouped under the site.
export function docsSitePages(): { site: DocsSite; pages: DocsSitePage[] }[] {
  return DOCS_SITES.map((site) => ({
    site,
    pages: docsSiteSources[site.id].getPages(),
  }));
}

function slugsUnder(pathname: string, base: string): string[] | null {
  if (pathname === base) return [];
  if (!pathname.startsWith(`${base}/`)) return null;
  return pathname
    .slice(base.length + 1)
    .split("/")
    .filter(Boolean);
}

// The docs page a url path names, in the main tree or a docs site, following
// the legacy paths a site page moved from.
export function resolveDocsUrl(pathname: string): DocsPage | undefined {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const path = rewriteLegacyDocsSitePath(normalized) ?? normalized;

  for (const site of DOCS_SITES) {
    const slugs = slugsUnder(path, docsSiteBaseUrl(site.id));
    if (slugs) return docsSiteSources[site.id].getPage(slugs);
  }

  const slugs = slugsUnder(path, "/docs");
  return slugs ? source.getPage(slugs) : undefined;
}
