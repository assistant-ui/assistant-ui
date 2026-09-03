import { getDistinctId } from "@/lib/posthog-server";
import { requirePublicAssistantSession } from "@/lib/anonymous-session";
import { checkPublicAssistantRateLimit } from "@/lib/rate-limit";
import { getModel } from "@/lib/ai/provider";
import { posthogTelemetry } from "@/lib/ai/telemetry";
import { parseFollowUpSuggestions } from "@/lib/follow-ups";
import { DEFAULT_MODEL_ID } from "@/lib/model";
import { generateText } from "ai";

export async function POST(req: Request): Promise<Response> {
  try {
    const session = requirePublicAssistantSession(req);
    if (session instanceof Response) return session;

    const rateLimitResponse = await checkPublicAssistantRateLimit(
      req,
      session.id,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const { prompt } = body;
    if (typeof prompt !== "string" || prompt.length > 12_000) {
      return new Response("Invalid prompt", { status: 400 });
    }

    const { text } = await generateText({
      model: getModel(DEFAULT_MODEL_ID),
      prompt,
      maxOutputTokens: 160,
      ...posthogTelemetry({
        distinctId: getDistinctId(req),
        spanName: "follow_up_suggestions",
        source: "follow_up_suggestions",
      }),
    });

    return Response.json({ suggestions: parseFollowUpSuggestions(text, 3) });
  } catch (e) {
    console.error("[api/suggestions]", e);
    return new Response("Request failed", { status: 500 });
  }
}
