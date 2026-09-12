import { notFound } from "next/navigation";
import { isPlatform } from "@/lib/docs-platform";
import { getDocsMarkdown } from "@/lib/docs-markdown";
import { createMarkdownResponse } from "@/lib/markdown-response";

export const dynamic = "force-static";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      platform: string;
      flavor: string;
      slug?: string[];
    }>;
  },
) {
  const { platform, flavor, slug } = await params;
  if (
    !isPlatform(platform) ||
    (flavor !== "base" && flavor !== "radix")
  ) {
    notFound();
  }

  return createMarkdownResponse(
    await getDocsMarkdown(slug, {
      platform,
      flavor,
    }),
  );
}
