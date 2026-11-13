import { unstable_cache } from "@farm.js/core/cache";
import {
  getDesignMarkdown,
  getDesignMarkdownStaticParams,
} from "@/lib/design-markdown";
import { createMarkdownResponse } from "@/lib/markdown-response";

const getMarkdown = unstable_cache(
  async function getMarkdown(slug: string[] | undefined) {
  return getDesignMarkdown(slug, "radix");
},
  ["app/(home)/radix-llms.mdx/design/[[...slug]]/route.ts#getMarkdown"],
  { revalidate: false },
);

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
