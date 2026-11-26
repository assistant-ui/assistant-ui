import { cacheLife } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { docsMarkdownRedirect } from "@/lib/docs-fallback";
import { isPlatform } from "@/lib/docs-platform";
import { getDocsMarkdown } from "@/lib/docs-markdown";
import type { LLMRenderContext } from "@/lib/get-llm-text";
import { createMarkdownResponse } from "@/lib/markdown-response";
import { source } from "@/lib/source";

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

  if (slug && !source.getPage(slug)) {
    // The query that picked this platform and flavor (lib/markdown-rewrites.ts).
    const query = new URLSearchParams();
    if (platform !== "react") query.set("platform", platform);
    if (flavor === "radix") query.set("view", "radix-ui");
    const overview = docsMarkdownRedirect(source, slug, query.toString());
    if (overview) redirect(overview);
  }

  return createMarkdownResponse(await getMarkdown(slug, platform, flavor));
}

// One prerendered page keeps the route cacheable: every other platform, flavor
// and page renders on its first request and stays cached until the next deploy.
// See `llms.mdx/[[...slug]]/route.ts`.
export function generateStaticParams() {
  return [{ platform: "react", flavor: "base", slug: [] }];
}
