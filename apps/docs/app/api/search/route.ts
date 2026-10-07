import { cacheLife } from "next/cache";
import { buildSearchIndex } from "@/lib/search/pages";

async function getSearchIndex() {
  "use cache";
  cacheLife("max");
  return buildSearchIndex();
}

export async function GET() {
  return Response.json(await getSearchIndex(), {
    headers: {
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
