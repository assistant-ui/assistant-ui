import { unstable_cache } from "@farm.js/core/cache";
import type { DocumentRecord } from "fumadocs-core/search/algolia";
import { design, elementsDocs } from "@/lib/source";
import { allDocsPages } from "@/lib/docs-pages";

const getResults = unstable_cache(
  async function getResults() {
    const results: DocumentRecord[] = [];

    for (const page of [
      ...allDocsPages(),
      ...design.getPages(),
      ...elementsDocs.getPages(),
    ]) {
      results.push({
        _id: page.url,
        structured: await page.data.structuredData(),
        url: page.url,
        title: page.data.title,
        description: page.data.description ?? "",
      });
    }

    return results;
  },
  ["app/static.json/route.ts#getResults"],
  { revalidate: false },
);

export async function GET() {
  return Response.json(await getResults(), {
    headers: {
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
