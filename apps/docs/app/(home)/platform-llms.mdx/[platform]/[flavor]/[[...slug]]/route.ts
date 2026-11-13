import { unstable_cache } from "@farm.js/core/cache";
import { notFound } from "@farm.js/core/navigation";
import { isPlatform } from "@/lib/docs-platform";
import { getDocsMarkdown } from "@/lib/docs-markdown";
import type { LLMRenderContext } from "@/lib/get-llm-text";
import { createMarkdownResponse } from "@/lib/markdown-response";

const getMarkdown = unstable_cache(
  async function getMarkdown(
  slug: string[] | undefined,
  platform: LLMRenderContext["platform"],
  flavor: LLMRenderContext["flavor"],
) {
  return getDocsMarkdown(slug, { platform, flavor });
},
  ["app/(home)/platform-llms.mdx/[platform]/[flavor]/[[...slug]]/route.ts#getMarkdown"],
  { revalidate: false },
);

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      platform: string;
      flavor: string;
      slug?: string[];
    }>;
  },
) {
  const { platform, flavor, slug } = await params;
  if (
    !isPlatform(platform) ||
    (flavor !== "base" && flavor !== "radix")
  ) {
    notFound();
  }

  return createMarkdownResponse(await getMarkdown(slug, platform, flavor));
}
