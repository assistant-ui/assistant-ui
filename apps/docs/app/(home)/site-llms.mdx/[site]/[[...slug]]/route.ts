import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { getLLMText } from "@/lib/get-llm-text";
import { docsSiteSources } from "@/lib/source";
import { DOCS_SITES, docsSiteBaseUrl, getDocsSite } from "@/lib/docs-sites";
import { createMarkdownResponse } from "@/lib/markdown-response";

async function getMarkdown(siteId: string, slug: string[] | undefined) {
  "use cache";
  cacheLife("max");
  const site = getDocsSite(siteId);
  if (!site) return null;
  const loader = docsSiteSources[site.id];

  if (!slug || slug.length === 0) {
    const index = loader.getPage([]);
    if (index) return getLLMText(index);

    return [
      `# ${site.title}`,
      `URL: ${docsSiteBaseUrl(site.id)}`,
      "",
      ...loader.getPages().map((page) => {
        const description = page.data.description
          ? `: ${page.data.description}`
          : "";
        return `- [${page.data.title}](${page.url}.md)${description}`;
      }),
    ].join("\n");
  }

  const page = loader.getPage(slug);
  if (!page) return null;
  return getLLMText(page);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ site: string; slug?: string[] }> },
) {
  const { site, slug } = await params;
  const markdown = await getMarkdown(site, slug);
  if (markdown === null) notFound();
  return createMarkdownResponse(markdown);
}

export function generateStaticParams() {
  return DOCS_SITES.flatMap((site) => [
    { site: site.id, slug: [] },
    ...docsSiteSources[site.id]
      .getPages()
      .map((page) => ({ site: site.id, slug: page.slugs })),
  ]);
}
