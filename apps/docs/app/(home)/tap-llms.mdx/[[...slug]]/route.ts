import { type NextRequest, NextResponse } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { getTapDocsPage, tapDocs } from "@/lib/source";
import { notFound } from "next/navigation";
import { MARKDOWN_RESPONSE_HEADERS } from "@/lib/markdown-response";

export const revalidate = false;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  // The Tap index MDX redirects; markdown should return content directly.
  const page = getTapDocsPage(slug);
  if (!page) notFound();

  return new NextResponse(await getLLMText(page), {
    headers: MARKDOWN_RESPONSE_HEADERS,
  });
}

export function generateStaticParams() {
  return tapDocs.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
