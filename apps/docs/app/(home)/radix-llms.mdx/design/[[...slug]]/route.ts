import { cacheLife } from "next/cache";
import {
  getDesignMarkdown,
  getDesignMarkdownStaticParams,
} from "@/lib/design-markdown";
import { createMarkdownResponse } from "@/lib/markdown-response";

async function getMarkdown(slug: string[] | undefined) {
  "use cache";
  cacheLife("max");
  return getDesignMarkdown(slug, "radix");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return createMarkdownResponse(await getMarkdown(slug));
}

export function generateStaticParams() {
  return getDesignMarkdownStaticParams();
}
