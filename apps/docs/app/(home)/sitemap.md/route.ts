import { buildMarkdownSitemap, createDiscoveryResponse } from "@/lib/agent-discovery";
import { design, elementsDocs, examples, getTapDocsPages, source } from "@/lib/source";

export const revalidate = false;

function sitemapDocument() {
  return buildMarkdownSitemap([
    { title: "Documentation", pages: source.getPages() },
    { title: "Tap documentation", pages: getTapDocsPages() },
    { title: "Examples", pages: examples.getPages() },
    { title: "Design", pages: design.getPages() },
    { title: "Elements", pages: elementsDocs.getPages() },
  ]);
}

export function GET() {
  return createDiscoveryResponse(sitemapDocument(), {
    contentType: "text/markdown; charset=utf-8",
  });
}

export function HEAD() {
  return createDiscoveryResponse(sitemapDocument(), {
    contentType: "text/markdown; charset=utf-8",
    head: true,
  });
}
