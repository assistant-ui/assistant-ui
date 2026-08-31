import type { SitemapPage } from "@/lib/agent-discovery";
import { buildMarkdownSitemap, createDiscoveryResponse } from "@/lib/agent-discovery";
import { design, elementsDocs, examples, getTapDocsPages, source } from "@/lib/source";

export const revalidate = false;

type LazyPage = {
  url: string;
  data: {
    title: string;
    description?: string | undefined;
    load: () => Promise<{ lastModified?: Date | undefined }>;
  };
};

function loadPages(pages: LazyPage[]): Promise<SitemapPage[]> {
  return Promise.all(
    pages.map(async (page) => ({
      url: page.url,
      data: {
        title: page.data.title,
        description: page.data.description,
        lastModified: (await page.data.load()).lastModified,
      },
    })),
  );
}

async function sitemapDocument() {
  return buildMarkdownSitemap([
    { title: "Documentation", pages: await loadPages(source.getPages()) },
    { title: "Tap documentation", pages: await loadPages(getTapDocsPages()) },
    { title: "Examples", pages: await loadPages(examples.getPages()) },
    { title: "Design", pages: await loadPages(design.getPages()) },
    { title: "Elements", pages: await loadPages(elementsDocs.getPages()) },
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
