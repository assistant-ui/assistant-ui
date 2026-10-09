import { cacheLife } from "next/cache";
import { design, elementsDocs, examples } from "@/lib/source";
import { allDocsPages } from "@/lib/docs-pages";
import { getLLMText } from "@/lib/get-llm-text";
import { createMarkdownResponse } from "@/lib/markdown-response";

async function getFullText() {
  "use cache";
  cacheLife("max");
  const scan = [
    ...allDocsPages(),
    ...examples.getPages(),
    ...design.getPages(),
    ...elementsDocs.getPages(),
  ].map((page) => getLLMText(page));
  const scanned = await Promise.all(scan);

  return scanned.join("\n\n");
}

export async function GET() {
  return createMarkdownResponse(
    await getFullText(),
    "text/plain; charset=utf-8",
  );
}
