import { unstable_cache } from "@farm.js/core/cache";
import { getLLMText } from "@/lib/get-llm-text";
import { elementsDocs } from "@/lib/source";
import { notFound } from "@farm.js/core/navigation";
import { createMarkdownResponse } from "@/lib/markdown-response";

const getMarkdown = unstable_cache(
  async function getMarkdown(slug: string[] | undefined) {
  if (!slug || slug.length === 0) {
    const lines = [
      "# Elements",
      "",
      "Chat UI components: usage and wiring guides for the element catalog.",
      "",
      ...elementsDocs.getPages().map((page) => {
        const description = page.data.description
          ? `: ${page.data.description}`
          : "";
        return `- [${page.data.title}](${page.url})${description}`;
      }),
    ];

    return lines.join("\n");
  }

  const page = elementsDocs.getPage(slug);
  if (!page) return null;

  return getLLMText(page);
},
  ["app/(home)/llms.mdx/elements/[[...slug]]/route.ts#getMarkdown"],
  { revalidate: false },
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const markdown = await getMarkdown(slug);
  if (markdown === null) notFound();
  return createMarkdownResponse(markdown);
}

export function generateStaticParams() {
  return elementsDocs.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
