import { type NextRequest, NextResponse } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { examples } from "@/lib/source";
import { notFound } from "next/navigation";
import { MARKDOWN_RESPONSE_HEADERS } from "@/lib/markdown-response";

export const revalidate = false;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = examples.getPage(slug);
  if (!page) notFound();

  return new NextResponse(await getLLMText(page), {
    headers: MARKDOWN_RESPONSE_HEADERS,
  });
}

export function generateStaticParams() {
  return examples.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
