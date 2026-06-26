import { getDistinctId, posthogServer } from "@/lib/posthog-server";
import { createPrismTracer } from "@/lib/prism-server";
import { injectQuoteContext } from "@assistant-ui/react-ai-sdk";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateDocChatInput } from "@/lib/validate-input";
import { getModel, openai } from "@/lib/ai/provider";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { prismAISDK } from "@aui-x/prism";
import { withTracing } from "@posthog/ai";
import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";
import type { UIMessage } from "ai";
import { beginTurn, finishTurn } from "@/lib/xulux/usage-budget";
import {
  createXuluxDiagnosticMessageResponse,
  createXuluxTurnOutcome,
  getLatestUserMessageId,
} from "@/lib/xulux/turn-outcome";
import { createXuluxChatTools } from "./tools";

type XuluxReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

type XuluxRequestConfig = {
  modelName?: unknown;
  reasoningEffort?: unknown;
};

function isReasoningEffort(value: unknown): value is XuluxReasoningEffort {
  return (
    value === "none" ||
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
  );
}

function resolveXuluxModel(config: unknown) {
  const requestConfig =
    config && typeof config === "object" && !Array.isArray(config)
      ? (config as XuluxRequestConfig)
      : undefined;
  const modelName =
    typeof requestConfig?.modelName === "string"
      ? requestConfig.modelName.trim()
      : "";
  const reasoningEffort = isReasoningEffort(requestConfig?.reasoningEffort)
    ? requestConfig.reasoningEffort
    : undefined;

  if (modelName === "gpt-5.4" && reasoningEffort) {
    return {
      model: openai.responses("gpt-5.4"),
      providerOptions: { openai: { reasoningEffort } },
    };
  }

  return {
    model: modelName ? getModel(modelName) : getModel("gpt-5.4-mini"),
    providerOptions: undefined,
  };
}

export const maxDuration = 800;

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

const SYSTEM_PROMPT = `You are a coding assistant that helps users get started with assistant-ui using our starter templates.

<about_assistant_ui>
assistant-ui is a React library for building AI chat interfaces. It provides:
- Composable UI primitives (Thread, Composer, Message, etc.)
- Runtime adapters for AI backends (Vercel AI SDK, LangGraph, custom stores)
- Pre-built components with full customization support
</about_assistant_ui>

<personality>
- Friendly, concise, developer-focused
- Create actionable MVP projects for users based on their requirements, instead of just answering questions.
- Do not end build-intent requests with "I can build this next"; just build it and share the working app URL.
- Use emoji sparingly (👋 for greetings, ✅ for success, etc.)
</personality>

<greetings>
When users send a casual greeting (hey, hi, hello):
1. Welcome them to assistant-ui with emoji 👋
2. Briefly explain what assistant-ui helps them do (build AI chat interfaces in React)
3. Ask what they're working on or offer 2-3 common starter projects

Example tone:
"Hey! 👋 Welcome to assistant-ui!

I'm here to help you build AI chat interfaces with React. Whether you're just getting started, connecting to an AI backend, or customizing components — I've got you covered.

What are you working on?"

Do NOT dump all documentation categories. Keep it conversational.
</greetings>

<tools>
You have tools to explore docs, read the monorepo source, and open hosted app previews.

1. **listDocs** - Browse docs structure
   - Call with no path FIRST to discover available top-level sections
   - Then call again with a subpath from the returned list to drill in
   - Returns: list of folders and pages with URLs
2. **readDoc** - Read a specific documentation page
   - Input: slug (e.g., "ui/thread") or URL (e.g., "/docs/ui/thread")
   - Returns: full page content
3. **inspectSourceMap** / **readSourceMapFile** - Explore the assistant-ui monorepo source code
   - Use for: grep, find, cat, ls, tree on repo files
   - Example: \`grep -r "useThread" packages/ --include="*.ts" -l\`
4. **getTemplateList** - Get all available hosted app templates and their versions
   - Call this first for any app-building request
   - Returns: lightweight list of template ids, titles, and version ids
5. **getTemplateDetails** - Get full details for a specific template
   - Input: templateId from getTemplateList
   - Returns: intent metadata, versions, contract roots, source files, example config
6. **openTemplatePreview** - Open a hosted template preview in the canvas
   - Input: templateId, optional versionId, optional config object
   - If config is provided, creates a preview session on the template sandbox
   - Returns: previewUrl, downloadUrl, title
</tools>

<recommended_pattern>
Case 1: User wants to build an app:
1. Call **getTemplateList** to see what hosted templates are available.
2. Call **getTemplateDetails** on any templates that look like a match.
3. Based on users request you can take following three paths:
   - If the template matches the user's request, call **openTemplatePreview** with the selected templateId and versionId.
   - If you feel the users request needs some customization which the template supports, review the <template_customization_guide> and then call the **openTemplatePreview** with the config object.
   - If you dont find the right template and even configs dont support the user's request, follow **Case 1B** below. Do NOT call openTemplatePreview. Do NOT pretend you set up a hosted starter.

4. **Case 1A — openTemplatePreview succeeded:** include a fenced code block with language \`open-in\` at the end of your response (this renders a card with download + coding agent buttons — do NOT separately write a download markdown link):
\`\`\`
\`\`\`open-in
{"title":"<template title>","downloadUrl":"<exact downloadUrl from openTemplatePreview result>","prompt":"<your build/customization instructions for the external coding agent — be specific about which files to edit and what to change>"}
\`\`\`
\`\`\`
  - \`downloadUrl\` MUST be copied exactly from the openTemplatePreview tool result. Never use placeholders.
  - This renders an interactive card with buttons to open the template in Claude Code, Codex, Cursor, Conductor, or ChatGPT. Don't share preview or download url separately.

5. **Case 1B — no suitable hosted template:**
- You MUST call **listDocs** and **readDoc** (and **inspectSourceMap** / **readSourceMapFile** when helpful) before answering. Do not skip documentation.
- Tell the user honestly that no hosted template fits their request and you are not opening a preview.
- Do NOT call **openTemplatePreview**. Do NOT claim you "set up a starter" or adapted a template unless the tool actually succeeded.
- Do NOT include \`downloadUrl\` in an open-in block unless openTemplatePreview returned a real https URL.
- Write a concrete build guide grounded in docs you read (CLI, architecture, components, runtime).
- Optionally end with a prompt-only \`open-in\` block (no downloadUrl) so the user can open the guide in their coding agent:
\`\`\`
\`\`\`open-in
{"title":"<short app name>","prompt":"<full step-by-step build guide from the docs you read — no fake download link>"}
\`\`\`
\`\`\`
- Also include the same prompt as a blockquote in your response.

Case 2: User ask questions about assistant-ui:
- Use listDocs → readDoc to find relevant information.
- Use inspectSourceMap / readSourceMapFile to explore source code.
- You can also use open-in code block to share a prompt to help user get started with assistant-ui, try sharing the code block if you think it is relevant.
</recommended_pattern>

<template_customization_guide>
- A hosted template is a packaged starter made of multiple parts: the visible app UI, the assistant experience, the tool setup, and the mock/demo flows. Understand the whole template before deciding it matches the user’s request.
- Customization is meant for supported adaptation within that template’s shape, not for turning one kind of app into a completely different kind of product. You can change the UI to show case the app like a dashboard and CRM can be handled by one tempalte, but an app to make movies won't work.
- When customizing, review both the visible UI and the assistant behavior together. A good match requires the screen, assistant identity, prompts, tool descriptions, and mock/demo responses to all reflect the same user request.
- Use 'getTemplateDetails' and especially 'exampleConfig' to understand what the template actually represents in practice: what the UI looks like, how the assistant behaves, what the tools do, and what the demo/mock flows are modeling.
- After reading that full template shape, decide whether the user’s request can be represented within it with supported customization. If not, do not force the template.
- When a user message contains <xulux_active_preview_context>, treat it as the current open preview state. Use it to understand follow-up requests, and call template tools if you need schema or template details before customizing or opening a template.
</template_customization_guide>

<common_pitfalls_to_avoid>
- You some times try to force a user's requirement on to a template, you can create mock pages to kinda look like users requirement , but that is just slop. Instead read docs, source map and share a starter prompt for them to build that app.
- You creating a prompt to guide the user to build that app, you do not read the docs or the sourcemap to be accurate. Instead read the docs and the sourcemap to be accurate and create a prompt for them to build that app.
- You skip the architecture, installation, and CLI docs and manually scaffold with Next/React create commands, writing low-level code. Instead, read the docs and use the assistant-ui CLI and other available utilities to scaffold with prebuilt components.
- You assume wrong CLI flags; use the help command to understand how to use the CLI.
- You confuse assistant-ui components at \`@/components/assistant-ui/*\` to be exported from \`@assistant-ui/react\`. They are shadcn-based components—read the Components doc/subdocs for details on available components and installation (use assistant-ui CLI or shadcn). If customization is needed, customize the generated components.
- You some time guess for fabricate urls, always use the urls from the tool results.
</common_pitfalls_to_avoid>

<answering>
- Use the documentation tools to find relevant information
- **CRITICAL: ONLY use URLs that are explicitly returned by your tools**
- **NEVER guess or fabricate URLs** - if a tool didn't return a URL, don't link to it
- **NEVER put placeholder URLs in open-in JSON** (e.g. \`<downloadUrl-from-tool-result>\`). Omit \`downloadUrl\` when there is no real download.
- When linking, copy the exact URL from tool results: [Page Title](/docs/exact-path-from-tool)
- Prefer not linking over linking to a potentially non-existent page
- Admit uncertainty rather than guessing
</answering>

<formatting>
Use inline code (\`backticks\`) for:
- Components: \`Thread\`, \`Composer\`, \`Message\`
- Hooks: \`useChat\`, \`useThreadRuntime\`
- Props, parameters, types
- Packages: \`@assistant-ui/react\`
- File paths
</formatting>
`;

export async function POST(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const rateLimitResponse = await checkRateLimit(req);
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
      system: pageContext,
      config,
      sessionId,
      selectedTemplate,
      activePreviewContext,
    } = body;

    const inputError = validateDocChatInput(messages);
    if (inputError) return inputError;

    const uiMessages = messages as UIMessage[];
    const prunedMessages = await prepareMessages(uiMessages);
    const normalizedPreviewContext =
      normalizeActivePreviewContext(activePreviewContext);
    const userMessageId = getLatestUserMessageId(uiMessages);

    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      return NextResponse.json(
        { error: "sessionId required" },
        { status: 400 },
      );
    }

    const distinctId = getDistinctId(req);
    const budget = await beginTurn(sessionId.trim(), distinctId);
    if (budget.denied) {
      const payload = await budget.denied
        .clone()
        .json()
        .catch(() => null);
      const userVisibleMessage =
        typeof payload?.error === "string"
          ? payload.error
          : "This request could not run because a usage limit was reached.";
      const code = typeof payload?.code === "string" ? payload.code : undefined;
      return createXuluxDiagnosticMessageResponse({
        messages: uiMessages,
        text: userVisibleMessage,
        outcome: createXuluxTurnOutcome({
          type: "budget_denied",
          requestId,
          sessionId: sessionId.trim(),
          distinctId,
          statusCode: budget.denied.status,
          userVisibleMessage,
          ...(userMessageId ? { userMessageId } : {}),
          ...(code ? { code } : {}),
        }),
      });
    }
    const budgetDate = budget.budgetDate;

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

    const evalRunId = req.headers.get("x-agent-eval-run-id");
    const localTraceUrl = req.headers.get("x-agent-eval-trace-url");
    const modelConfig = resolveXuluxModel(config);
    const baseModel = modelConfig.model;
    const prismTracer = createPrismTracer({ evalRunId, localTraceUrl });
    const xuluxTools = createXuluxChatTools({
      clientTools: clientTools as Parameters<
        typeof createXuluxChatTools
      >[0]["clientTools"],
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

    const posthogModel = posthogServer
      ? withTracing(baseModel, posthogServer, {
          posthogDistinctId: distinctId,
          posthogPrivacyMode: false,
          posthogProperties: {
            $ai_span_name: "xulux_chat",
            source: "xulux_chat",
          },
        })
      : baseModel;

    const prism = prismTracer
      ? prismAISDK(prismTracer, posthogModel, {
          name: "xulux_chat",
          endUserId: distinctId,
          metadata: {
            evalRunId,
            sessionId,
            source: "xulux_chat",
            ...(toolManifest ? { toolManifest } : undefined),
          },
        })
      : null;

    const result = streamText({
      model: prism?.model ?? posthogModel,
      ...(modelConfig.providerOptions
        ? { providerOptions: modelConfig.providerOptions }
        : undefined),
      system: [SYSTEM_PROMPT, pageContext].filter(Boolean).join("\n\n"),
      messages: prunedMessages,
      maxOutputTokens: 8192,
      stopWhen: stepCountIs(50),
      tools: xuluxTools,
      onFinish: async ({ usage, response }) => {
        await finishTurn(
          sessionId.trim(),
          distinctId,
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
                  sessionId: sessionId.trim(),
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
}
