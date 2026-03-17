import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import { remarkInclude } from "fumadocs-mdx/config";
import { source } from "@/lib/source";
import type { InferPageType } from "fumadocs-core/source";

const processor = remark().use(remarkMdx).use(remarkInclude).use(remarkGfm);

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await processor.process({
    path: page.path,
    value: await page.data.getText("processed"),
  });

  return `# ${page.data.title}
URL: ${page.url}
${page.data.description ? `\n${page.data.description}\n` : ""}
${processed.value}`;
}
