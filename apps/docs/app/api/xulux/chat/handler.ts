import { getDistinctId } from "@/lib/posthog-server";
import { createPrismTracer, prismAISDK } from "@/lib/prism-server";
import { injectQuoteContext, type FrontendTools } from "@assistant-ui/ai-sdk";
import { checkPublicAssistantRateLimit } from "@/lib/rate-limit";
import { requirePublicAssistantSession } from "@/lib/anonymous-session";
import { validateDocChatInput } from "@/lib/validate-input";
import { posthogTelemetry } from "@/lib/ai/telemetry";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";
import type { UIMessage } from "ai";
import type { ToolSet } from "ai";
import { beginTurn, finishTurn } from "@/lib/xulux/usage-budget";
import {
  createXuluxDiagnosticMessageResponse,
  createXuluxTurnOutcome,
  getLatestUserMessageId,
} from "@/lib/xulux/turn-outcome";
import type { XuluxAgentDefinition } from "./agents";
import { resolveChatModel } from "@/lib/ai/provider";

const PRUNE_OPTIONS = {
  toolCalls: "before-last-2-messages",
  reasoning: "none",
  emptyMessages: "remove",
} as const;

type SelectedTemplateRequestContext = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  kind?: unknown;
  prompt?: unknown;
  sourcePath?: unknown;
  downloadUrl?: unknown;
};

type ActivePreviewRequestContext = {
  source: "template_modal" | "agent_tool";
  templateId: string;
  versionId?: string | null;
  customized: boolean;
  config?: JsonObject;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const MAX_ACTIVE_PREVIEW_CONFIG_CHARS = 8_000;
const MAX_RAW_MESSAGES_CHARS = 1_000_000;
const MAX_SYSTEM_CHARS = 4_000;
const MAX_SESSION_ID_CHARS = 128;

async function prepareMessages(messages: readonly UIMessage[]) {
  const modelMessages = await convertToModelMessages(
    injectQuoteContext([...messages]),
  );
  return pruneMessages({ messages: modelMessages, ...PRUNE_OPTIONS });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeJsonObject(value: unknown): JsonObject | undefined {
  if (!isRecord(value)) return undefined;
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_ACTIVE_PREVIEW_CONFIG_CHARS) return undefined;
    return JSON.parse(json) as JsonObject;
  } catch {
    return undefined;
  }
}

function normalizeActivePreviewContext(
  value: unknown,
): ActivePreviewRequestContext | null {
  if (!isRecord(value)) return null;
  const source = value.source;
  const templateId = value.templateId;
  const versionId = value.versionId;
  const customized = value.customized;
  if (
    (source !== "template_modal" && source !== "agent_tool") ||
    typeof templateId !== "string" ||
    typeof customized !== "boolean"
  ) {
    return null;
  }
  const config = normalizeJsonObject(value.config);
  return {
    source,
    templateId,
    ...(typeof versionId === "string" || versionId === null
      ? { versionId }
      : {}),
    customized,
    ...(config ? { config } : {}),
  };
}

function appendHiddenText(message: { content: unknown }, text: string) {
  if (typeof message.content === "string") {
    message.content = `${message.content}\n\n${text}`;
  } else if (Array.isArray(message.content)) {
    message.content = [...message.content, { type: "text", text }];
  }
}

function formatActivePreviewContext(context: ActivePreviewRequestContext) {
  const json = JSON.stringify(context).replaceAll("<", "\\u003c");
  return [
    "<xulux_active_preview_context>",
    "Treat this as the currently open preview state.",
    json,
    "</xulux_active_preview_context>",
  ].join("\n");
}

function formatSelectedTemplateContext(
  selectedTemplate: unknown,
): string | null {
  if (!selectedTemplate || typeof selectedTemplate !== "object") return null;
  const template = selectedTemplate as SelectedTemplateRequestContext;
  const id = typeof template.id === "string" ? template.id : null;
  const title = typeof template.title === "string" ? template.title : null;
  if (!id || !title) return null;

  const lines = [
    "<selected_template_context>",
    `The user selected this ${template.kind === "example" ? "example" : "template"} before sending their message.`,
    `id: ${id}`,
    `title: ${title}`,
  ];

  if (typeof template.description === "string") {
    lines.push(`description: ${template.description}`);
  }
  if (typeof template.prompt === "string") {
    lines.push(`catalog_prompt: ${template.prompt}`);
  }
  if (typeof template.sourcePath === "string") {
    lines.push(`sourcePath: ${template.sourcePath}`);
  }
  if (typeof template.downloadUrl === "string") {
    lines.push(`downloadUrl: ${template.downloadUrl}`);
  }

  lines.push(
    "Use this as hidden context for the user's next build request. Do not mention this tag unless it is directly useful.",
    "</selected_template_context>",
  );
  return lines.join("\n");
}

export function createXuluxChatHandler(agent: XuluxAgentDefinition) {
  return async function POST(req: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    if (!isAiPlaygroundEnabled) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    try {
      const publicSession = requirePublicAssistantSession(req);
      if (publicSession instanceof Response) return publicSession;

      const rateLimitResponse = await checkPublicAssistantRateLimit(
        req,
        publicSession.id,
      );
      if (rateLimitResponse) return rateLimitResponse;

      const body = await req.json().catch(() => null);
      if (!isRecord(body)) {
        return NextResponse.json(
          { error: "Invalid JSON request body." },
          { status: 400 },
        );
      }

      const {
        messages,
        tools: clientTools,
        system: rawPageContext,
        config,
        sessionId: bodySessionId,
        selectedTemplate,
        activePreviewContext,
      } = body;

      if (!Array.isArray(messages)) {
        return new Response("Invalid messages format", { status: 400 });
      }
      if (JSON.stringify(messages).length > MAX_RAW_MESSAGES_CHARS) {
        return new Response("Input too long", { status: 400 });
      }

      const uiMessages = messages as UIMessage[];
      const preparedUiMessages = agent.prepareMessages
        ? agent.prepareMessages({
            body,
            messages: uiMessages,
            routeUrl: req.url,
          })
        : uiMessages;
      const prunedMessages = await prepareMessages(preparedUiMessages);
      const pageContext =
        agent.allowRequestSystemPrompt !== false &&
        typeof rawPageContext === "string" &&
        rawPageContext.length <= MAX_SYSTEM_CHARS
          ? rawPageContext
          : undefined;

      const normalizedPreviewContext =
        normalizeActivePreviewContext(activePreviewContext);
      const userMessageId = getLatestUserMessageId(uiMessages);

      const resolvedSessionId = agent.resolveSessionId
        ? agent.resolveSessionId({ body, routeUrl: req.url })
        : bodySessionId;

      if (
        typeof resolvedSessionId !== "string" ||
        resolvedSessionId.trim().length === 0 ||
        resolvedSessionId.trim().length > MAX_SESSION_ID_CHARS
      ) {
        return NextResponse.json(
          { error: "sessionId required" },
          { status: 400 },
        );
      }
      const sessionId = resolvedSessionId.trim();
      const budgetSessionId = `${publicSession.id}:${sessionId}`;

      const isFirstUserTurn =
        prunedMessages.filter((m) => m.role === "user").length === 1 &&
        !prunedMessages.some((m) => m.role === "assistant");
      if (isFirstUserTurn) {
        const templateContext = formatSelectedTemplateContext(selectedTemplate);
        const firstUser = prunedMessages.find((m) => m.role === "user");
        if (templateContext && firstUser) {
          appendHiddenText(firstUser, templateContext);
        }
      }
      if (normalizedPreviewContext) {
        const latestUser = [...prunedMessages]
          .reverse()
          .find((m) => m.role === "user");
        if (latestUser) {
          appendHiddenText(
            latestUser,
            formatActivePreviewContext(normalizedPreviewContext),
          );
        }
      }

      const inputError = validateDocChatInput(prunedMessages);
      if (inputError) return inputError;

      const preparedTools = agent.prepareTools({
        body,
        clientTools: clientTools as FrontendTools,
        routeUrl: req.url,
      });
      if (preparedTools instanceof Response) return preparedTools;
      const xuluxTools: ToolSet = preparedTools;

      const distinctId = getDistinctId(req);
      const budget = await beginTurn(budgetSessionId, publicSession.id);
      if (budget.denied) {
        const payload = await budget.denied
          .clone()
          .json()
          .catch(() => null);
        const userVisibleMessage =
          typeof payload?.error === "string"
            ? payload.error
            : "This request could not run because a usage limit was reached.";
        const code =
          typeof payload?.code === "string" ? payload.code : undefined;
        return createXuluxDiagnosticMessageResponse({
          messages: uiMessages,
          text: userVisibleMessage,
          outcome: createXuluxTurnOutcome({
            type: "budget_denied",
            requestId,
            sessionId,
            distinctId,
            statusCode: budget.denied.status,
            userVisibleMessage,
            ...(userMessageId ? { userMessageId } : {}),
            ...(code ? { code } : {}),
          }),
        });
      }
      const budgetDate = budget.budgetDate;

      const evalRunId = req.headers.get("x-agent-eval-run-id");
      const localTraceUrl = req.headers.get("x-agent-eval-trace-url");
      const modelConfig = resolveChatModel(
        agent.modelName ? { modelName: agent.modelName } : config,
      );
      const baseModel = modelConfig.model;
      const prismTracer = createPrismTracer({ evalRunId, localTraceUrl });
      const traceName = agent.traceName ?? "xulux_chat";
      const traceMetadata = agent.getTraceMetadata?.({
        body,
        routeUrl: req.url,
      });
      const toolManifest =
        process.env.XULUX_EVAL_MODE === "1"
          ? Object.entries(xuluxTools).map(([name, tool]) => {
              const { description, inputSchema } = tool as {
                description?: unknown;
                inputSchema?: { jsonSchema?: unknown };
              };
              return {
                name,
                ...(typeof description === "string" ? { description } : {}),
                ...(inputSchema?.jsonSchema
                  ? { inputSchema: inputSchema.jsonSchema }
                  : {}),
              };
            })
          : undefined;

      const prism = prismTracer
        ? prismAISDK(prismTracer, baseModel, {
            name: traceName,
            endUserId: distinctId,
            metadata: {
              evalRunId,
              sessionId,
              source: traceName,
              ...(traceMetadata ?? {}),
              ...(toolManifest ? { toolManifest } : undefined),
            },
          })
        : null;

      const result = streamText({
        model: prism?.model ?? baseModel,
        ...(modelConfig.providerOptions
          ? { providerOptions: modelConfig.providerOptions }
          : undefined),
        system: [agent.systemPrompt, pageContext].filter(Boolean).join("\n\n"),
        messages: prunedMessages,
        maxOutputTokens:
          agent.maxOutputTokens ?? (modelConfig.reasoning ? 16384 : 8192),
        stopWhen: stepCountIs(agent.maxSteps),
        tools: xuluxTools,
        ...posthogTelemetry({
          distinctId,
          spanName: traceName,
          source: traceName,
          properties: traceMetadata ?? {},
        }),
        ...(agent.activeToolsAfterFirstStep
          ? {
              prepareStep: ({ stepNumber }: { stepNumber: number }) =>
                stepNumber > 0
                  ? { activeTools: agent.activeToolsAfterFirstStep }
                  : {},
            }
          : {}),
        onFinish: async ({ usage, response }) => {
          await finishTurn(
            budgetSessionId,
            publicSession.id,
            usage,
            response.modelId,
            budgetDate,
          );
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
        sendReasoning: modelConfig.reasoning,
        originalMessages: uiMessages,
        messageMetadata: ({ part }) => {
          if (part.type === "finish-step") {
            return { modelId: part.response.modelId };
          }
          if (part.type === "finish") {
            return {
              usage: part.totalUsage,
              custom: {
                usage: part.totalUsage,
                xulux: {
                  outcome: createXuluxTurnOutcome({
                    type: "assistant_response_completed",
                    requestId,
                    sessionId,
                    distinctId,
                    ...(userMessageId ? { userMessageId } : {}),
                  }),
                  ...(normalizedPreviewContext
                    ? {
                        activePreviewContext: {
                          value: normalizedPreviewContext,
                          ...(userMessageId
                            ? { injectedIntoUserMessageId: userMessageId }
                            : {}),
                        },
                      }
                    : {}),
                },
              },
            };
          }
          return undefined;
        },
      });
    } catch (e) {
      console.error("[api/xulux/chat]", e);
      return new Response("Request failed", { status: 500 });
    }
  };
}
