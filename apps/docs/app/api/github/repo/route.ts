import { getRepo } from "@/lib/github";

export const revalidate = 3600;

export async function GET() {
  const repo = await getRepo();
  return Response.json(repo, {
    headers: {
      "Cache-Control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
