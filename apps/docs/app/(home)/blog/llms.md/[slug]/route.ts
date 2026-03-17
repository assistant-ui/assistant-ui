import { type NextRequest, NextResponse } from "next/server";
import { blog, type BlogPage } from "@/lib/source";
import { notFound } from "next/navigation";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import { remarkInclude } from "fumadocs-mdx/config";

const processor = remark().use(remarkMdx).use(remarkInclude).use(remarkGfm);

export const revalidate = false;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const page = blog.getPage([slug]) as BlogPage | undefined;
  if (!page) notFound();

  const processed = await processor.process({
    path: page.path,
    value: await page.data.getText("processed"),
  });

  const text = `# ${page.data.title}
URL: ${page.url}
${page.data.description ? `\n${page.data.description}\n` : ""}
${processed.value}`;

  return new NextResponse(text, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0]!,
  }));
}
