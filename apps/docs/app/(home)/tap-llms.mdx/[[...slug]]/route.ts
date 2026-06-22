import { type NextRequest, NextResponse } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { tapDocs } from "@/lib/source";
import { notFound } from "next/navigation";

export const revalidate = false;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const effectiveSlug =
    slug && slug.length > 0 ? slug : ["overview", "introduction"];
  const page = tapDocs.getPage(effectiveSlug);
  if (!page) notFound();

  return new NextResponse(await getLLMText(page), {
    headers: {
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}

export function generateStaticParams() {
  return tapDocs.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
