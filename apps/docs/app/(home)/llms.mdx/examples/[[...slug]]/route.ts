import type { NextRequest } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { examples } from "@/lib/source";
import { notFound } from "next/navigation";
import { createMarkdownResponse } from "@/lib/markdown-response";

export const revalidate = false;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = examples.getPage(slug);
  if (!page) notFound();

  return createMarkdownResponse(await getLLMText(page));
}

export function generateStaticParams() {
  return examples.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
