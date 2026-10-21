import { cacheLife } from "next/cache";
import { buildMarkdownSitemap, createDiscoveryResponse } from "@/lib/agent-discovery";
import { design, elementsDocs, examples, source } from "@/lib/source";
import { docsSitePages } from "@/lib/docs-pages";

async function sitemapDocument() {
  "use cache";
  cacheLife("max");
  return buildMarkdownSitemap([
    { title: "Documentation", pages: source.getPages() },
    ...docsSitePages().map(({ site, pages }) => ({ title: site.title, pages })),
    { title: "Examples", pages: examples.getPages() },
    { title: "Design", pages: design.getPages() },
    { title: "Elements", pages: elementsDocs.getPages() },
  ]);
}

export async function GET() {
  return createDiscoveryResponse(await sitemapDocument(), {
    contentType: "text/markdown; charset=utf-8",
  });
}

export async function HEAD() {
  return createDiscoveryResponse(await sitemapDocument(), {
    contentType: "text/markdown; charset=utf-8",
    head: true,
  });
}
