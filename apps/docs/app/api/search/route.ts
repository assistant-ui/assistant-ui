import { buildSearchIndex } from "@/lib/search/pages";

export const revalidate = false;

export async function GET() {
  return Response.json(await buildSearchIndex(), {
    headers: {
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
