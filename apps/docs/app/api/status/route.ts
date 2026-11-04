import { isModelProviderDegraded } from "@/lib/ai/model-provider-errors";
import { getStatusState } from "@/lib/status";
import type { StatusState } from "@/lib/status-state";

/**
 * The status page does not watch the model provider behind the demos, so a
 * recent provider failure (quota, 5xx, unreachable) recorded by the chat
 * routes lowers an operational reading to degraded.
 */
export async function GET() {
  const [statusPage, providerDegraded] = await Promise.all([
    getStatusState(),
    isModelProviderDegraded().catch(() => false),
  ]);

  let state: StatusState | null = statusPage;
  if (providerDegraded && (state === null || state === "operational")) {
    state = "degraded";
  }

  if (state === null) {
    return Response.json({ error: "status unavailable" }, { status: 503 });
  }
  return Response.json(
    { state },
    {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    },
  );
}
