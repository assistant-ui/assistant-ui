import { getDistinctId, posthogServer } from "@/lib/posthog-server";
import { injectQuoteContext } from "@/lib/quote";
import { checkRateLimit } from "@/lib/rate-limit";
import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { withTracing } from "@posthog/ai";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const rateLimitResponse = await checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const { messages, tools } = await req.json();

  const baseModel = openai("gpt-5-nano");

  const tracedModel = posthogServer
    ? withTracing(baseModel, posthogServer, {
        posthogDistinctId: getDistinctId(req),
        posthogPrivacyMode: false,
        posthogProperties: {
          $ai_span_name: "general_chat",
          source: "general_chat",
        },
      })
    : baseModel;

  const prunedMessages = pruneMessages({
    messages: await convertToModelMessages(injectQuoteContext(messages)),
    reasoning: "none",
  });

  const result = streamText({
    model: tracedModel,
    messages: prunedMessages,
    maxOutputTokens: 15000,
    stopWhen: stepCountIs(10),
    tools: frontendTools(tools),
    onError: console.error,
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish-step") {
        return { modelId: part.response.modelId };
      }
      return undefined;
    },
  });
}
