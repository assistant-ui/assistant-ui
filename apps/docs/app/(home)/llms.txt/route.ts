import { unstable_cache } from "@farm.js/core/cache";
import { design, elementsDocs, examples, source } from "@/lib/source";
import { buildLLMSIndex } from "@/lib/llms-index";
import { docsSitePages } from "@/lib/docs-pages";

const getIndex = unstable_cache(
  async function getIndex() {
    return buildLLMSIndex(
      source.getPages(),
      examples.getPages(),
      design.getPages(),
      elementsDocs.getPages(),
      docsSitePages().map(({ site, pages }) => ({ title: site.title, pages })),
    );
  },
  ["app/(home)/llms.txt/route.ts#getIndex"],
  { revalidate: false },
);

export async function GET() {
  return new Response(await getIndex(), {
    headers: {
      "Cache-Control": "no-cache, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
