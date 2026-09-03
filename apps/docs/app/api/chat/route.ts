import { getDistinctId } from "@/lib/posthog-server";
import {
  injectQuoteContext,
  unstable_injectInteractableContext as injectInteractableContext,
} from "@assistant-ui/ai-sdk";
import { checkPublicAssistantRateLimit } from "@/lib/rate-limit";
import {
  PUBLIC_ASSISTANT_CROSS_ORIGINS,
  requirePublicAssistantSession,
} from "@/lib/anonymous-session";
import { validateGeneralChatInput } from "@/lib/validate-input";
import { resolveChatModel } from "@/lib/ai/provider";
import { posthogTelemetry } from "@/lib/ai/telemetry";
import { AISDKToolkit } from "@assistant-ui/ai-sdk";
import docsToolkit from "@/lib/docs-toolkit";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";

export const maxDuration = 300;

const aiToolkit = new AISDKToolkit({ toolkit: docsToolkit });

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!PUBLIC_ASSISTANT_CROSS_ORIGINS.has(origin)) return {};
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
    const session = requirePublicAssistantSession(req);
    if (session instanceof Response) return withCors(req, session);

    const rateLimitResponse = await checkPublicAssistantRateLimit(
      req,
      session.id,
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

    const { model, providerOptions, reasoning } = resolveChatModel(config);
    const distinctId = getDistinctId(req);

    const prunedMessages = pruneMessages({
      messages: await convertToModelMessages(
        injectInteractableContext(injectQuoteContext(messages)),
      ),
      reasoning: "none",
    });

    const result = streamText({
      model,
      ...(providerOptions ? { providerOptions } : {}),
      ...(system ? { system } : {}),
      messages: prunedMessages,
      maxOutputTokens: reasoning ? 16384 : 4096,
      stopWhen: stepCountIs(10),
      tools: await aiToolkit.tools({ frontend: tools }),
      ...posthogTelemetry({
        distinctId,
        spanName: "general_chat",
        source: "general_chat",
      }),
      onError: ({ error }) => {
        console.error(error);
      },
    });

    const response = result.toUIMessageStreamResponse({
      sendReasoning: true,
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
