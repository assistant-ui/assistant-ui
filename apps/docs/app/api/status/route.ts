import { getStatusState } from "@/lib/status";

export async function GET() {
  const state = await getStatusState();
  if (state === null) {
    return Response.json({ error: "status unavailable" }, { status: 503 });
  }
  return Response.json(
    { state },
    {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    },
  );
}
