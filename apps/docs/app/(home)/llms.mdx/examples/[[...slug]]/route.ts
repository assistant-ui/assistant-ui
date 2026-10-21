import { cacheLife } from "next/cache";
import type { NextRequest } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { examples } from "@/lib/source";
import { notFound } from "next/navigation";
import { createMarkdownResponse } from "@/lib/markdown-response";

async function getMarkdown(slug: string[] | undefined) {
  "use cache";
  cacheLife("max");
  const page = examples.getPage(slug);
  if (!page) return null;
  return getLLMText(page);
}

export async function GET(
  _req: NextRequest,
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
