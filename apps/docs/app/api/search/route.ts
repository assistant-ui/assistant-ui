import { unstable_cache } from "@farm.js/core/cache";
import { buildSearchIndex } from "@/lib/search/pages";

const getSearchIndex = unstable_cache(
  async function getSearchIndex() {
    return buildSearchIndex();
  },
  ["app/api/search/route.ts#getSearchIndex"],
  { revalidate: false },
);

export async function GET() {
  return Response.json(await getSearchIndex(), {
    headers: {
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
