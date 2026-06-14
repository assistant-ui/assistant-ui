import { getWeeklyDownloads } from "@/lib/npm";

export const revalidate = 21600;

export async function GET() {
  const downloads = await getWeeklyDownloads();
  if (downloads === null) {
    return Response.json(
      { error: "npm download data unavailable" },
      { status: 503 },
    );
  }
  return Response.json(
    { downloads },
    {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
      },
    },
  );
}
