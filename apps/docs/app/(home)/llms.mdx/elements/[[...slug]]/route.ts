import { NextResponse } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { elementsDocs } from "@/lib/source";
import { notFound } from "next/navigation";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    const lines = [
      "# Elements",
      "",
      "Chat UI components: usage and wiring guides for the element catalog.",
      "",
      ...elementsDocs.getPages().map((page) => {
        const description = page.data.description
          ? `: ${page.data.description}`
          : "";
        return `- [${page.data.title}](${page.url})${description}`;
      }),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Cache-Control": "no-cache, must-revalidate",
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Robots-Tag": "noindex, follow",
      },
    });
  }

  const page = elementsDocs.getPage(slug);
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
  return elementsDocs.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
