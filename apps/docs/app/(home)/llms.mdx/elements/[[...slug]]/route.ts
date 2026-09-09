import { NextResponse } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { elementsDocs } from "@/lib/source";
import { notFound } from "next/navigation";
import { MARKDOWN_RESPONSE_HEADERS } from "@/lib/markdown-response";

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
      headers: MARKDOWN_RESPONSE_HEADERS,
    });
  }

  const page = elementsDocs.getPage(slug);
  if (!page) notFound();

  return new NextResponse(await getLLMText(page), {
    headers: MARKDOWN_RESPONSE_HEADERS,
  });
}

export function generateStaticParams() {
  return elementsDocs.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
