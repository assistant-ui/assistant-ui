import { unstable_cache } from "@farm.js/core/cache";
import { design, elementsDocs, examples } from "@/lib/source";
import { allDocsPages } from "@/lib/docs-pages";
import { getLLMText } from "@/lib/get-llm-text";
import { createMarkdownResponse } from "@/lib/markdown-response";

const getFullText = unstable_cache(
  async function getFullText() {
    const scan = [
      ...allDocsPages(),
      ...examples.getPages(),
      ...design.getPages(),
      ...elementsDocs.getPages(),
    ].map((page) => getLLMText(page));
    const scanned = await Promise.all(scan);

    return scanned.join("\n\n");
  },
  ["app/(home)/llms-full.txt/route.ts#getFullText"],
  { revalidate: false },
);

export async function GET() {
  return createMarkdownResponse(
    await getFullText(),
    "text/plain; charset=utf-8",
  );
}
