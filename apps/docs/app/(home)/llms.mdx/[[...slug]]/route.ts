import { unstable_cache } from "@farm.js/core/cache";
import { getDocsMarkdown } from "@/lib/docs-markdown";
import { createMarkdownResponse } from "@/lib/markdown-response";

const getMarkdown = unstable_cache(
  async function getMarkdown(slug: string[] | undefined) {
  return getDocsMarkdown(slug, { flavor: "base", platform: "react" });
},
  ["app/(home)/llms.mdx/[[...slug]]/route.ts#getMarkdown"],
  { revalidate: false },
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return createMarkdownResponse(await getMarkdown(slug));
}
