import {
  getDesignMarkdown,
  getDesignMarkdownStaticParams,
} from "@/lib/design-markdown";
import { createMarkdownResponse } from "@/lib/markdown-response";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return createMarkdownResponse(await getDesignMarkdown(slug, "radix"));
}

export function generateStaticParams() {
  return getDesignMarkdownStaticParams();
}
