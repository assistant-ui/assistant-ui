import { getDistinctId, posthogServer } from "@/lib/posthog-server";
import { createPrismTracer } from "@/lib/prism-server";
import { injectQuoteContext } from "@assistant-ui/react-ai-sdk";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateGeneralChatInput } from "@/lib/validate-input";
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

const ALLOWED_ORIGINS = [
  "https://assistant-ui-expo.vercel.app",
  "http://localhost:8081",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, User-Agent",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  try {
    const rateLimitResponse = await checkRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const { messages, system: rawSystem, tools, config } = body;

    // Basic validation: only accept short system prompts to limit abuse surface
    const MAX_SYSTEM_LENGTH = 4000;
    const system =
      typeof rawSystem === "string" && rawSystem.length <= MAX_SYSTEM_LENGTH
        ? rawSystem
        : undefined;

    const inputError = validateGeneralChatInput(messages);
    if (inputError) {
      const cors = corsHeaders(req);
      for (const [key, value] of Object.entries(cors)) {
        inputError.headers.set(key, value);
      }
      return inputError;
    }

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
      ...(system ? { system } : {}),
      messages: prunedMessages,
      maxOutputTokens: 4096,
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

    const cors = corsHeaders(req);
    const response = result.toUIMessageStreamResponse({
      // gets usage and modelId for assistant-cloud telemetry reports
      messageMetadata: ({ part }) => {
        if (part.type === "finish-step") {
          return {
            modelId: part.response.modelId,
          };
        }
        if (part.type === "finish") {
          return {
            usage: part.totalUsage,
          };
        }
        return undefined;
      },
    });

    // Append CORS headers
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }

    return response;
  } catch (e) {
    console.error("[api/chat]", e);
    return new Response("Request failed", { status: 500 });
  }
}
