import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { isPlatform } from "@/lib/docs-platform";
import { getDocsMarkdown } from "@/lib/docs-markdown";
import type { LLMRenderContext } from "@/lib/get-llm-text";
import { createMarkdownResponse } from "@/lib/markdown-response";

async function getMarkdown(
  slug: string[] | undefined,
  platform: LLMRenderContext["platform"],
  flavor: LLMRenderContext["flavor"],
) {
  "use cache";
  cacheLife("max");
  return getDocsMarkdown(slug, { platform, flavor });
}

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
