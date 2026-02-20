import { getDistinctId, posthogServer } from "@/lib/posthog-server";
import { createPrismTracer } from "@/lib/prism-server";
import { injectQuoteContext } from "@/lib/quote";
import { checkRateLimit } from "@/lib/rate-limit";
import { getModel } from "@/lib/ai/provider";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { prismAISDK } from "@aui-x/prism";
import { withTracing } from "@posthog/ai";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const rateLimitResponse = await checkRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const { messages, tools, config } = body;

    const baseModel = getModel(config?.modelName);
    const distinctId = getDistinctId(req);
    const prismTracer = createPrismTracer();

    const posthogModel = posthogServer
      ? withTracing(baseModel, posthogServer, {
          posthogDistinctId: distinctId,
          posthogPrivacyMode: false,
          posthogProperties: {
            $ai_span_name: "general_chat",
            source: "general_chat",
          },
        })
      : baseModel;

    const prism = prismTracer
      ? prismAISDK(prismTracer, posthogModel, {
          name: "general_chat",
          endUserId: distinctId,
        })
      : null;

    const prunedMessages = pruneMessages({
      messages: await convertToModelMessages(injectQuoteContext(messages)),
      reasoning: "none",
    });

    const result = streamText({
      model: prism?.model ?? posthogModel,
      messages: prunedMessages,
      maxOutputTokens: 15000,
      stopWhen: stepCountIs(10),
      tools: frontendTools(tools),
      onFinish: async () => {
        await prism?.end();
      },
      onError: async ({ error }) => {
        console.error(error);
        await prism?.end({ status: "error" });
      },
      onAbort: async () => {
        await prism?.end();
      },
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "finish-step") {
          return {
            modelId: part.response.modelId,
            usage: part.usage,
          };
        }
        return undefined;
      },
    });
  } catch (e) {
    console.error("[api/chat]", e);
    return new Response("Request failed", { status: 500 });
  }
}
