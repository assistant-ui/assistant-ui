import { type NextRequest, NextResponse } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";
import { notFound } from "next/navigation";

// The flavor query parameter varies the response, so this route renders per
// request instead of being prerendered.
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug);
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
