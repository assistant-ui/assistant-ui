// The AI gateway for appOS apps embedded on the Examples pages. The embed
// (@assistant-ui/appos's aiGateway) posts each of the app's model calls here as
// { model?, options } and reads NDJSON stream parts back (aiResponse).
//
// The app asks for a model, but this route is public, so it picks the
// docs' default public model and ignores the hint. It shares the public
// assistant's anonymous session and rate limits with /api/chat.
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";
import {
  AiError,
  aiErrorResponse,
  aiResponse,
} from "@assistant-ui/appos/server";
import { checkPublicAssistantRateLimit } from "@/lib/rate-limit";
import { requirePublicAssistantSession } from "@/lib/anonymous-session";
import { resolveChatModel } from "@/lib/ai/provider";
import { toPublicStreamError } from "@/lib/ai/model-provider-errors";

export const maxDuration = 60;

const MAX_OUTPUT_TOKENS = 4096;

type WrapStream = NonNullable<LanguageModelMiddleware["wrapStream"]>;
type StreamPart =
  Awaited<ReturnType<WrapStream>>["stream"] extends ReadableStream<infer P>
    ? P
    : never;

/** The embed shows the app an error's code and message; refusals keep their own text. */
async function refusal(response: Response): Promise<Response> {
  const text = await response.text();
  let message = text;
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string") message = parsed.error;
  } catch {
    // plain text
  }
  const code =
    response.status === 429
      ? "rate-limited"
      : response.status === 401 || response.status === 403
        ? "denied"
        : "unavailable";
  const retryAfter = response.headers.get("retry-after");
  return aiErrorResponse(
    response.status,
    code,
    message || "The AI gateway refused the call.",
    retryAfter ? { "Retry-After": retryAfter } : undefined,
  );
}

/**
 * The docs' model settings on top of the app's call: a capped output, the
 * model's own provider options in place of the app's, and provider errors
 * reworded so no gateway or plan detail reaches the page.
 */
const publicModel = (
  providerOptions: ReturnType<typeof resolveChatModel>["providerOptions"],
): LanguageModelMiddleware => ({
  specificationVersion: "v4",
  transformParams: async ({ params }) => ({
    ...params,
    maxOutputTokens: Math.min(
      params.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
      MAX_OUTPUT_TOKENS,
    ),
    providerOptions: providerOptions ?? {},
  }),
  wrapStream: async ({ doStream }) => {
    let result: Awaited<ReturnType<typeof doStream>>;
    try {
      result = await doStream();
    } catch (error) {
      throw new AiError("provider", toPublicStreamError(error));
    }
    return {
      ...result,
      stream: result.stream.pipeThrough(
        new TransformStream<StreamPart, StreamPart>({
          transform(part, controller) {
            controller.enqueue(
              part.type === "error"
                ? {
                    type: "error",
                    error: new AiError(
                      "provider",
                      toPublicStreamError(part.error),
                    ),
                  }
                : part,
            );
          },
        }),
      ),
    };
  },
});

export async function POST(request: Request) {
  const session = requirePublicAssistantSession(request);
  if (session instanceof Response) return refusal(session);

  const limited = await checkPublicAssistantRateLimit(request, session.id);
  if (limited) return refusal(limited);

  if (!process.env.OPENAI_API_KEY) {
    return aiErrorResponse(
      503,
      "unavailable",
      "AI isn't set up on this server (no OPENAI_API_KEY).",
    );
  }

  const body = await request.json().catch(() => undefined);
  const { model, providerOptions } = resolveChatModel(undefined);
  return aiResponse(body, {
    model: () =>
      wrapLanguageModel({ model, middleware: publicModel(providerOptions) }),
    signal: request.signal,
  });
}
