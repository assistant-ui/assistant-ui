import { getRepo } from "@/lib/github";

export const revalidate = 3600;

export async function GET() {
  const repo = await getRepo();
  if (!repo) {
    return Response.json(
      { error: "Repository data unavailable" },
      { status: 503 },
    );
  }
  return Response.json(repo, {
    headers: {
      "Cache-Control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
