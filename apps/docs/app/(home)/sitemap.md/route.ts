import { cacheLife } from "next/cache";
import { buildMarkdownSitemap, createDiscoveryResponse } from "@/lib/agent-discovery";
import { design, elementsDocs, examples, source } from "@/lib/source";

async function sitemapDocument() {
  "use cache";
  cacheLife("max");
  return buildMarkdownSitemap([
    { title: "Documentation", pages: source.getPages() },
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
