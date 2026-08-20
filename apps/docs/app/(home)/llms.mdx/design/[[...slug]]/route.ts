import { type NextRequest, NextResponse } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { design } from "@/lib/source";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    const lines = [
      "# Design",
      "",
      "The design system: actions, inputs, display, overlays, and navigation.",
      "",
      ...design.getPages().map((page) => {
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

  const page = design.getPage(slug);
  if (!page) notFound();

  const flavor =
    req.nextUrl.searchParams.get("view") === "radix-ui" ? "radix" : "base";

  return new NextResponse(await getLLMText(page, { flavor }), {
    headers: {
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
    },
  });
}

export function generateStaticParams() {
  return design.getPages().map((page) => ({
    slug: page.slugs,
  }));
}
