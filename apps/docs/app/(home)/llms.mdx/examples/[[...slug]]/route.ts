import { unstable_cache } from "@farm.js/core/cache";
import { getLLMText } from "@/lib/get-llm-text";
import { examples } from "@/lib/source";
import { notFound } from "@farm.js/core/navigation";
import { createMarkdownResponse } from "@/lib/markdown-response";

const getMarkdown = unstable_cache(
  async function getMarkdown(slug: string[] | undefined) {
  const page = examples.getPage(slug);
  if (!page) return null;
  return getLLMText(page);
},
  ["app/(home)/llms.mdx/examples/[[...slug]]/route.ts#getMarkdown"],
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
  return examples.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
