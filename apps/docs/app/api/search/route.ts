import { buildSearchIndex } from "@/lib/search/pages";

export const revalidate = false;

export function GET() {
  return Response.json(buildSearchIndex(), {
    headers: {
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
