import { getDistinctId } from "@/lib/posthog-server";
import { requirePublicAssistantSession } from "@/lib/anonymous-session";
import { checkFollowUpSuggestionRateLimit } from "@/lib/rate-limit";
import { getModel } from "@/lib/ai/provider";
import { posthogTelemetry } from "@/lib/ai/telemetry";
import { parseFollowUpSuggestions } from "@/lib/follow-ups";
import { DEFAULT_MODEL_ID } from "@/lib/model";
import { generateText } from "ai";

const MAX_PROMPT_LENGTH = 24_000;
const PROMPT_HEAD_LENGTH = 2_000;

const PROMPT_SEPARATOR = "\n\n[...]\n\n";

function boundPrompt(prompt: string): string {
  if (prompt.length <= MAX_PROMPT_LENGTH) return prompt;
  const head = prompt.slice(0, PROMPT_HEAD_LENGTH);
  const tail = prompt.slice(
    -(MAX_PROMPT_LENGTH - PROMPT_HEAD_LENGTH - PROMPT_SEPARATOR.length),
  );
  return `${head}${PROMPT_SEPARATOR}${tail}`;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const session = requirePublicAssistantSession(req);
    if (session instanceof Response) return session;

    const rateLimitResponse = await checkFollowUpSuggestionRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json().catch(() => null);
    const prompt = (body as { prompt?: unknown } | null)?.prompt;
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response("Invalid prompt", { status: 400 });
    }

    const { text } = await generateText({
      model: getModel(DEFAULT_MODEL_ID),
      prompt: boundPrompt(prompt),
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
