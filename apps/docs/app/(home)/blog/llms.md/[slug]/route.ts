import { unstable_cache } from "@farm.js/core/cache";
import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-docs-directive";
import { createMarkdownResponse } from "@/lib/markdown-response";
import { blog, type BlogPage } from "@/lib/source";
import { notFound } from "@farm.js/core/navigation";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";

const processor = remark().use(remarkMdx).use(remarkGfm);

const getMarkdown = unstable_cache(
  async function getMarkdown(slug: string) {
  const page = blog.getPage([slug]) as BlogPage | undefined;
  if (!page) return null;

  const processed = await processor.process({
    path: page.path,
    value: await page.data.getText("processed"),
  });

  const text = `# ${page.data.title}
URL: ${page.url}
${page.data.description ? `\n${page.data.description}\n` : ""}
${AGENT_DOCS_DIRECTIVE_MARKDOWN}

${processed.value}`;

  return text;
},
  ["app/(home)/blog/llms.md/[slug]/route.ts#getMarkdown"],
  { revalidate: false },
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const markdown = await getMarkdown(slug);
  if (markdown === null) notFound();
  return createMarkdownResponse(markdown);
}

export function generateStaticParams() {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0]!,
  }));
}
