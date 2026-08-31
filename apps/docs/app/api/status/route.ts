import { getStatusState } from "@/lib/status";

export const revalidate = 300;

export async function GET() {
  const state = await getStatusState();
  return Response.json(
    { state },
    {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
