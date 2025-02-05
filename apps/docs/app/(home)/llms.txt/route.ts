import * as fs from "node:fs/promises";
import fg from "fast-glob";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import remarkMdx from "remark-mdx";

export const revalidate = false;

export async function GET() {
  const files = await fg([
    "./content/docs/**/*.mdx",
    "!*.model.mdx",
    "!./content/docs/openapi/**/*",
  ]);

  const scan = files.map(async (file) => {
    const fileContent = await fs.readFile(file);
    const { content, data } = matter(fileContent.toString());

    if (data["_mdx"]?.mirror) {
      return;
    }

    const processed = await processContent(content);
    return `file: ${file}
# ${data["title"]}

${data["description"] ?? ""}
        
${processed}`;
  });

  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"));
}

async function processContent(content: string): Promise<string> {
  const file = await remark()
    .use(remarkMdx)
    .use(remarkGfm)
    // .use(remarkDocGen, { generators: [typescriptGenerator(), fileGenerator()] })
    // .use(remarkInstall, { persist: { id: "package-manager" } })
    .use(remarkStringify)
    .process(content);

  return String(file);
}
