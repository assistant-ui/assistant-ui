import { cacheLife } from "next/cache";
import { design, examples, source } from "@/lib/source";
import { elementsMarkdownPages } from "@/lib/elements-markdown";
import { buildLLMSIndex } from "@/lib/llms-index";
import { docsSitePages } from "@/lib/docs-pages";

async function getIndex() {
  "use cache";
  cacheLife("max");
  return buildLLMSIndex(
    source.getPages(),
    examples.getPages(),
    design.getPages(),
    elementsMarkdownPages(),
    docsSitePages().map(({ site, pages }) => ({ title: site.title, pages })),
  );
}

export async function GET() {
  return new Response(await getIndex(), {
    headers: {
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
