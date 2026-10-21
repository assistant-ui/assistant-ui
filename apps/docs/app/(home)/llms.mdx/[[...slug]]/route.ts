import { cacheLife } from "next/cache";
import { getDocsMarkdown } from "@/lib/docs-markdown";
import { createMarkdownResponse } from "@/lib/markdown-response";

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
  return createMarkdownResponse(await getMarkdown(slug));
}
