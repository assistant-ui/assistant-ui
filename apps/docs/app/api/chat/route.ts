import {
  prepareChatMessages,
  prepareDemoChatMessages,
  streamDocsChat,
} from "@/lib/ai/chat-route";
import {
  injectQuoteContext,
  unstable_injectInteractableContext as injectInteractableContext,
} from "@assistant-ui/ai-sdk";
import { withAssistantCloudTraceMetadata } from "assistant-cloud/telemetry";
import {
  checkChatRateLimit,
  checkPublicAssistantRateLimit,
  getClientIp,
  recordChatTokens,
} from "@/lib/rate-limit";
import {
  PUBLIC_ASSISTANT_CROSS_ORIGINS,
  requirePublicAssistantSession,
} from "@/lib/anonymous-session";
import { claimConversation, resolveDemoIdentity } from "@/lib/demo-usage";
import { PUBLIC_ASSISTANT_CONVERSATION_LIMIT_MESSAGE } from "@/lib/public-assistant-errors";
import {
  validateDemoChatInput,
  validateGeneralChatInput,
} from "@/lib/validate-input";
import {
  ChatRequestError,
  readChatRequest,
  stepsUsedInTurn,
} from "@/lib/ai/chat-request";
import {
  captureChatRefusal,
  captureChatTurn,
  classifyChatSurface,
  summarizeChatTurn,
} from "@/lib/ai/telemetry";
import { resolveChatModel } from "@/lib/ai/provider";
import { getSession } from "@/lib/accounts-auth";
import { toPublicStreamError } from "@/lib/ai/model-provider-errors";
import { createSearchDocsTool } from "@/lib/ai/search-docs";
import { searchImagesTool } from "@/lib/ai/search-images";
import { AISDKToolkit } from "@assistant-ui/ai-sdk";
import docsToolkit from "@/lib/docs-toolkit";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
} from "ai";

export const maxDuration = 300;

/** Model steps one request may run. The last one answers without tools. */
const MAX_STEPS = 10;
/**
 * Model steps one user turn may run across the requests a browser tool
 * starts (the client sends the conversation again with the tool's result).
 * Once they are spent, a request gets one step, without tools, to answer.
 */
const MAX_TURN_STEPS = 20;

const modelIdOf = (model: unknown): string =>
  typeof model === "object" &&
  model !== null &&
  "modelId" in model &&
  typeof model.modelId === "string"
    ? model.modelId
    : "unknown";

type TokenUsage = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
};

const tokensOf = (usage: TokenUsage | undefined) =>
  (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);

const aiToolkit = new AISDKToolkit({ toolkit: docsToolkit });

const SEARCH_DOCS_SYSTEM_INSTRUCTION =
  "When the user asks about assistant-ui (its APIs, components, runtimes, setup, or documentation), call search_docs before answering and answer from its results. Cite the pages you used inline as markdown links with their titles. Never cite a page search_docs did not return.";

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

    const rateLimitResponse =
      (await checkPublicAssistantRateLimit(req, session.id)) ??
      (await checkChatRateLimit(req, session.id));
    if (rateLimitResponse) {
      if (rateLimitResponse.status === 429) {
        await captureChatRefusal("rate_limited", classifyChatSurface(req));
      }
      return withCors(req, rateLimitResponse);
    }

    // A client's `system` text and tools stay (the demos define them in the
    // browser), but only inside the request schema's bounds.
    let request;
    try {
      request = readChatRequest(await req.json());
    } catch (error) {
      const refusal =
        error instanceof ChatRequestError
          ? error
          : error instanceof SyntaxError
            ? new ChatRequestError("invalid_request")
            : null;
      if (!refusal) throw error;
      await captureChatRefusal(refusal.code, classifyChatSurface(req));
      return withCors(req, new Response(refusal.message, { status: 400 }));
    }
    const {
      messages,
      system: rawSystem,
      tools,
      config,
      searchDocs: searchDocsRequested,
      countConversations,
      threadId,
    } = request;
    const surface = classifyChatSurface(req, { countConversations });

    const sameOrigin = req.headers.get("sec-fetch-site") === "same-origin";
    const budgeted = countConversations && !!threadId;
    // The landing page demo draws on the daily conversation budget, and its
    // requests carry the preloaded generative UI guidance and the specs it
    // renders, so only its own requests get a longer system prompt and larger
    // messages, with older tool calls pruned before the model call.
    const demo = budgeted && sameOrigin;

    // Basic validation: only accept short system prompts to limit abuse surface
    const MAX_SYSTEM_LENGTH = demo ? 40_000 : 4000;
    const groundInDocs = searchDocsRequested && sameOrigin;
    const system = [
      rawSystem !== undefined && rawSystem.length <= MAX_SYSTEM_LENGTH
        ? rawSystem
        : undefined,
      groundInDocs ? SEARCH_DOCS_SYSTEM_INSTRUCTION : undefined,
    ]
      .filter(Boolean)
      .join("\n\n");

    const inputError = demo
      ? validateDemoChatInput(messages)
      : validateGeneralChatInput(messages);
    if (inputError) {
      await captureChatRefusal("too_large", surface);
      return withCors(req, inputError);
    }

    const signedIn = (await getSession().catch(() => null)) !== null;
    const modelConfig = resolveChatModel(config, { signedIn });
    const origin = new URL(req.url).origin;

    const frontendTools = await aiToolkit.tools({ frontend: tools });
    if (groundInDocs && "search_docs" in frontendTools) {
      return withCors(
        req,
        new Response("search_docs is reserved on this endpoint", {
          status: 400,
        }),
      );
    }

    // Only a surface that renders specs can show photos, so only it gets image search.
    const chatTools =
      "render_spec" in frontendTools
        ? { ...frontendTools, search_images: searchImagesTool }
        : frontendTools;

    const prunedMessages = await (
      demo ? prepareDemoChatMessages : prepareChatMessages
    )(injectInteractableContext(injectQuoteContext(messages)), chatTools);

    // Every docs surface shares this route, so only the one that opts in draws
    // on the budget, and only after the deterministic rejections, so a request
    // that was never going to run cannot spend a slot. The transport sends the
    // thread id, so the day counts conversations rather than turns.
    if (budgeted) {
      const identity = await resolveDemoIdentity(session.id);
      const { allowed, usage } = await claimConversation(
        identity,
        threadId,
        getClientIp(req),
      );
      if (!allowed) {
        return withCors(
          req,
          new Response(PUBLIC_ASSISTANT_CONVERSATION_LIMIT_MESSAGE, {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.max(1, Math.ceil((usage.resetAt - Date.now()) / 1_000)),
              ),
            },
          }),
        );
      }
    }

    // A turn's steps are counted across the requests its browser tools start,
    // and the last step a request may run answers without tools, so a turn
    // never ends on a tool call that would send it again.
    const stepsUsed = stepsUsedInTurn(messages);
    const stepBudget = Math.min(
      MAX_STEPS,
      Math.max(1, MAX_TURN_STEPS - stepsUsed),
    );

    let turnLogged = false;
    const logTurn = (
      ended: "finished" | "error" | "aborted",
      steps: Parameters<typeof summarizeChatTurn>[0]["steps"],
      usage?: {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
      },
    ) => {
      if (turnLogged) return;
      turnLogged = true;
      return captureChatTurn({
        surface,
        model: modelIdOf(modelConfig?.model),
        ...summarizeChatTurn({ steps, stepBudget, ended }),
        step_budget: stepBudget,
        continuation: stepsUsed > 0 ? 1 : 0,
        client_tools: Object.keys(tools).length,
        client_system: system ? 1 : 0,
        input_tokens: usage?.inputTokens,
        output_tokens: usage?.outputTokens,
      });
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const { result, messageMetadata } = streamDocsChat(
          req,
          modelConfig,
          {
            spanName: "general_chat",
            source: "general_chat",
            properties: { surface },
          },
          {
            ...(system ? { system } : {}),
            messages: prunedMessages,
            maxOutputTokens: modelConfig.reasoning ? 16384 : 4096,
            stopWhen: stepCountIs(stepBudget),
            prepareStep: ({ stepNumber }) =>
              stepNumber >= stepBudget - 1 ? { toolChoice: "none" } : undefined,
            onEnd: async ({ steps, totalUsage }) => {
              await Promise.all([
                logTurn("finished", steps, totalUsage),
                recordChatTokens(req, tokensOf(totalUsage)),
              ]);
            },
            onAbort: async ({ steps }) => {
              await Promise.all([
                logTurn("aborted", steps),
                recordChatTokens(
                  req,
                  steps.reduce((sum, step) => sum + tokensOf(step.usage), 0),
                ),
              ]);
            },
            onError: async ({ error }) => {
              console.error(error);
              await logTurn("error", []);
            },
            tools: groundInDocs
              ? {
                  ...chatTools,
                  search_docs: createSearchDocsTool({ writer, origin }),
                }
              : chatTools,
          },
        );

        writer.merge(
          result.toUIMessageStream({
            originalMessages: messages,
            sendReasoning: true,
            messageMetadata: withAssistantCloudTraceMetadata(messageMetadata),
            onError: toPublicStreamError,
          }),
        );
      },
      onError: toPublicStreamError,
    });

    const response = createUIMessageStreamResponse({ stream });

    return withCors(req, response);
  } catch (e) {
    console.error("[api/chat]", e);
    return withCors(req, new Response("Request failed", { status: 500 }));
  }
}
