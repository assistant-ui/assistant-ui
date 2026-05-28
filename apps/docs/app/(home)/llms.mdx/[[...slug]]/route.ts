import { type NextRequest, NextResponse } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { examples, source } from "@/lib/source";
import { notFound } from "next/navigation";

export const revalidate = false;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page =
    source.getPage(slug) ??
    (slug?.[0] === "examples" ? examples.getPage(slug.slice(1)) : undefined);
  if (!page) notFound();

  return new NextResponse(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}

export function generateStaticParams() {
  return [
    ...source.getPages().map((page) => ({
      slug: page.slugs,
    })),
    ...examples.getPages().map((page) => ({
      slug: ["examples", ...page.slugs],
    })),
  ];
}
