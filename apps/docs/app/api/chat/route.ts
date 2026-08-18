import { getDistinctId } from "@/lib/posthog-server";
import { createPrismTracer, prismAISDK } from "@/lib/prism-server";
import {
  injectQuoteContext,
  unstable_injectInteractableContext as injectInteractableContext,
} from "@assistant-ui/ai-sdk";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAnonymousSession } from "@/lib/anonymous-session";
import { validateGeneralChatInput } from "@/lib/validate-input";
import { getModel } from "@/lib/ai/provider";
import { posthogTelemetry } from "@/lib/ai/telemetry";
import { AISDKToolkit } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";

export const maxDuration = 30;

let aiToolkitPromise: Promise<AISDKToolkit> | null = null;

function getAiToolkit() {
  aiToolkitPromise ??= import("@/lib/docs-toolkit").then(
    ({ default: toolkit }) => new AISDKToolkit({ toolkit }),
  );
  return aiToolkitPromise;
}

const ALLOWED_ORIGINS = [
  "https://assistant-ui-expo.vercel.app",
  "https://assistant-ui-ink.vercel.app",
  "http://localhost:8081",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, User-Agent, X-Assistant-UI-Anonymous-Session",
    Vary: "Origin",
  };
}

function withCors(req: Request, response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    response.headers.set(key, value);
  }
  return response;
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  try {
    const anonymousSession = requireAnonymousSession(req);
    if (anonymousSession instanceof Response) {
      return withCors(req, anonymousSession);
    }

    const rateLimitResponse = await checkRateLimit(
      req,
      `anonymous:${anonymousSession.id}`,
    );
    if (rateLimitResponse) return withCors(req, rateLimitResponse);

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
      return withCors(req, inputError);
    }

    const baseModel = getModel(config?.modelName);
    const distinctId = getDistinctId(req);
    const prismTracer = createPrismTracer();

    const prism = prismTracer
      ? prismAISDK(prismTracer, baseModel, {
          name: "general_chat",
          endUserId: distinctId,
        })
      : null;

    const prunedMessages = pruneMessages({
      messages: await convertToModelMessages(
        injectInteractableContext(injectQuoteContext(messages)),
      ),
      reasoning: "none",
    });

    const result = streamText({
      model: prism?.model ?? baseModel,
      ...(system ? { system } : {}),
      messages: prunedMessages,
      maxOutputTokens: 4096,
      stopWhen: stepCountIs(10),
      tools: await (await getAiToolkit()).tools({ frontend: tools }),
      ...posthogTelemetry({
        distinctId,
        spanName: "general_chat",
        source: "general_chat",
      }),
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

    return withCors(req, response);
  } catch (e) {
    console.error("[api/chat]", e);
    return withCors(req, new Response("Request failed", { status: 500 }));
  }
}
