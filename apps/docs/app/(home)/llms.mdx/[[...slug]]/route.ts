import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { docsMarkdownRedirect } from "@/lib/docs-fallback";
import { getDocsMarkdown } from "@/lib/docs-markdown";
import { createMarkdownResponse } from "@/lib/markdown-response";
import { source } from "@/lib/source";

async function getMarkdown(slug: string[] | undefined) {
  "use cache";
  cacheLife("max");
  return getDocsMarkdown(slug, { flavor: "base", platform: "react" });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  if (slug && !source.getPage(slug)) {
    const overview = docsMarkdownRedirect(source, slug);
    if (overview) redirect(overview);
  }
  return createMarkdownResponse(await getMarkdown(slug));
}

// Cache Components renders a dynamic route on every request unless the build
// prerenders at least one of its pages. With one prerendered, every other page
// renders on its first request and stays cached until the next deploy, and the
// build doesn't have to render them all.
export function generateStaticParams() {
  return [{ slug: [] }];
}
