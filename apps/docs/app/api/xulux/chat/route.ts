import { getDistinctId, posthogServer } from "@/lib/posthog-server";
import { createPrismTracer } from "@/lib/prism-server";
import { injectQuoteContext } from "@assistant-ui/react-ai-sdk";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateDocChatInput } from "@/lib/validate-input";
import { getModel, openai } from "@/lib/ai/provider";
import { prismAISDK } from "@aui-x/prism";
import { withTracing } from "@posthog/ai";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";
import type { UIMessage } from "ai";
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

function resolveXuluxModel(config: XuluxRequestConfig | undefined) {
  const modelName =
    typeof config?.modelName === "string" ? config.modelName.trim() : "";
  const reasoningEffort = isReasoningEffort(config?.reasoningEffort)
    ? config.reasoningEffort
    : undefined;

  if (modelName === "gpt-5.4" && reasoningEffort) {
    return {
      model: openai.responses("gpt-5.4"),
      providerOptions: { openai: { reasoningEffort } },
    };
  }

  return {
    model: modelName ? getModel(modelName) : openai.responses("gpt-5.4"),
    providerOptions: modelName
      ? undefined
      : { openai: { reasoningEffort: "low" } },
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
  docsUrl?: unknown;
};

async function prepareMessages(messages: readonly UIMessage[]) {
  const modelMessages = await convertToModelMessages(
    injectQuoteContext([...messages]),
  );
  return pruneMessages({ messages: modelMessages, ...PRUNE_OPTIONS });
}

function formatSelectedTemplateContext(
  selectedTemplate: SelectedTemplateRequestContext | null | undefined,
): string | null {
  if (!selectedTemplate || typeof selectedTemplate !== "object") return null;
  const id =
    typeof selectedTemplate.id === "string" ? selectedTemplate.id : null;
  const title =
    typeof selectedTemplate.title === "string" ? selectedTemplate.title : null;
  if (!id || !title) return null;

  const lines = [
    "<selected_template_context>",
    `The user selected this ${selectedTemplate.kind === "example" ? "example" : "template"} before sending their message.`,
    `id: ${id}`,
    `title: ${title}`,
  ];

  if (typeof selectedTemplate.description === "string") {
    lines.push(`description: ${selectedTemplate.description}`);
  }
  if (typeof selectedTemplate.prompt === "string") {
    lines.push(`catalog_prompt: ${selectedTemplate.prompt}`);
  }
  if (typeof selectedTemplate.sourcePath === "string") {
    lines.push(`sourcePath: ${selectedTemplate.sourcePath}`);
  }
  if (typeof selectedTemplate.docsUrl === "string") {
    lines.push(`docsUrl: ${selectedTemplate.docsUrl}`);
  }

  lines.push(
    "Use this as hidden context for the user's next build request. Do not mention this tag unless it is directly useful.",
    "</selected_template_context>",
  );
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a coding assistant that helps users build starter MVP projects with assistant-ui.

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
You have tools to explore docs, read the monorepo source, and operate a live sandbox.

1. **listDocs** - Browse docs structure
   - Call with no path FIRST to discover available top-level sections
   - Then call again with a subpath from the returned list to drill in
   - Returns: list of folders and pages with URLs
2. **readDoc** - Read a specific documentation page
   - Input: slug (e.g., "ui/thread") or URL (e.g., "/docs/ui/thread")
   - Returns: full page content
3. **inspectSourceMap** / **readSourceMapFile** - Explore the source code of the assistant-ui monorepo
   - Use for: grep, find, cat, awk, head, tail, wc, ls, tree, etc.
   - Example: \`grep -r "useThread" packages/ --include="*.ts" -l\`
   - This is not real sandbox, we just provision the mono repo code through a sourcemap
4. **provisionSandbox** - Call this once before using the sandbox. Pass the sessionId from the request.
   - Creates (or resumes) a cloud sandbox tied to this session
5. **exec** - Run any shell command in the live sandbox
   - Write files: \`printf '%s' "$CONTENT" > /workspace/file.ts\` or use \`tee\`
   - Read files: \`cat /workspace/file.ts\`
   - Install deps: \`cd /workspace && npm install\`
   - Start the server: see <running_the_server> below — this is the step that breaks most often, follow it exactly
   - All standard shell tools available: grep, find, ls, tree, curl, lsof, etc.
6. **refreshCanvas** - Send the preview URL to the client
   - Only after the server is ready and responding on port 3000
   - Returns: preview URL
</tools>

<recommended_pattern>
- User asks a question →
- **Discovery**: agent starts with listDocs to find relevant section → readDoc to get content -> bash to explore the source code
- **Planning**: agent plans how to implement the user's request based on **Discovery** results
- **Execution**: agent provisions the sandbox -> executes the plan -> checks server readiness <running_the_server> -> uses refreshCanvas to send the preview URL to the client

Points to remember:
- Use \`npx tsc -b --noEmit\` for TypeScript fix loops; avoid repeated \`npm run build\` until typecheck passes because full builds create unnecessary delays.
</recommended_pattern>

<common_pitfalls_to_avoid>
- You skip the architecture, installation, and CLI docs and manually scaffold with Next/React create commands, writing low-level code. Instead, read the docs and use the assistant-ui CLI and other available utilities to scaffold with prebuilt components.
- You assume wrong CLI flags; use the help command to understand how to use the CLI.
- You confuse assistant-ui components at \`@/components/assistant-ui/*\` to be exported from \`@assistant-ui/react\`. They are shadcn-based components—read the Components doc/subdocs for details on available components and installation (use assistant-ui CLI or shadcn). If customization is needed, customize the generated components.
- You replace real API/LLM code with mock-only code. Instead, keep the real code path and add a mock fallback for when keys are absent.
</common_pitfalls_to_avoid>

<running_the_server>
The Blaxel preview only proxies **port 3000** on **0.0.0.0**. The sandbox image may set a \`PORT\` env var (often 80), so a server started with default settings can end up on the wrong port or bound to localhost only — either way the preview is blank. Whatever you're running — a Node dev server (Next.js, Vite, etc.), a Python server (\`uvicorn\`, \`flask run\`, \`python -m http.server\`), or anything else — these rules are the same:

1. **The server MUST listen on host \`0.0.0.0\` and port \`3000\`.** Figure out the right flags/env for the stack you scaffolded (check \`package.json\` scripts, the framework docs, or the template README) and pass them explicitly. Examples — adapt, don't copy blindly:
   - Next.js: \`PORT=3000 npm run dev -- --hostname 0.0.0.0 --port 3000\`
     a. IF its a next.js app - Before starting the dev server, add \`allowedDevOrigins: ["*.preview.bl.run"]\` to \`next.config.js\` / \`next.config.ts\`, preserving existing config fields. This is so we dont get HMR issues when accessing the preview.
   - Vite: \`npm run dev -- --host 0.0.0.0 --port 3000\` — first add \`server: { allowedHosts: true }\` to \`vite.config.ts\`/\`.js\` (preserve existing fields). This is so we dont get route issues accessing.
   - uvicorn: \`uvicorn main:app --host 0.0.0.0 --port 3000\`
   - Flask: \`flask run --host 0.0.0.0 --port 3000\`

2. **If restarting, kill anything already on the port 3000**

3. **Start it backgrounded with logs to a file** so the exec call returns immediately and you can inspect output:
   \`cd /workspace/<project> && nohup <your start command bound to 0.0.0.0:3000> > /tmp/server.log 2>&1 &\`

4. **Wait for readiness — do not skip this.** Poll until the server actually responds:
   \`for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost:3000 && echo READY && break; sleep 1; done; echo "--- server.log ---"; cat /tmp/server.log\`
   - If you see \`READY\`, proceed.
   - If you see \`EADDRINUSE\` / "address already in use", go back to step 2 (kill harder), then retry.
   - If you see a build/compile/import error in the log, fix the code and restart. Read the error — don't guess.
   - If it never becomes ready, tell the user it failed and show the relevant log lines. Do NOT call \`refreshCanvas\` or claim success.

5. Only once the readiness check passes: call \`refreshCanvas\` and tell the user the app is running. Never send a preview link or say "Done" for a server you haven't confirmed is responding on \`0.0.0.0:3000\`.
</running_the_server>

<answering>
- Use the documentation tools to find relevant information
- **CRITICAL: ONLY use URLs that are explicitly returned by your tools**
- **NEVER guess or fabricate URLs** - if a tool didn't return a URL, don't link to it
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
  try {
    const rateLimitResponse = await checkRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const {
      messages,
      tools: clientTools,
      system: pageContext,
      config,
      sessionId,
      selectedTemplate,
    } = body;

    const prunedMessages = await prepareMessages(messages);

    const inputError = validateDocChatInput(prunedMessages);
    if (inputError) return inputError;

    const isFirstUserTurn =
      prunedMessages.filter((m) => m.role === "user").length === 1 &&
      !prunedMessages.some((m) => m.role === "assistant");
    if (isFirstUserTurn) {
      const templateContext = formatSelectedTemplateContext(selectedTemplate);
      const firstUser = prunedMessages.find((m) => m.role === "user");
      if (templateContext && firstUser) {
        if (typeof firstUser.content === "string") {
          firstUser.content = `${firstUser.content}\n\n${templateContext}`;
        } else if (Array.isArray(firstUser.content)) {
          firstUser.content = [
            ...firstUser.content,
            { type: "text", text: templateContext },
          ];
        }
      }
    }

    const evalRunId = req.headers.get("x-agent-eval-run-id");
    const localTraceUrl = req.headers.get("x-agent-eval-trace-url");
    const modelConfig = resolveXuluxModel(config);
    const baseModel = modelConfig.model;
    const distinctId = getDistinctId(req);
    const prismTracer = createPrismTracer({ evalRunId, localTraceUrl });
    const xuluxTools = createXuluxChatTools({
      clientTools,
      sessionId,
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
      originalMessages: messages,
      messageMetadata: ({ part }) => {
        if (part.type === "finish-step") {
          return { modelId: part.response.modelId };
        }
        if (part.type === "finish") {
          return { custom: { usage: part.totalUsage } };
        }
        return undefined;
      },
    });
  } catch (e) {
    console.error("[api/xulux/chat]", e);
    return new Response("Request failed", { status: 500 });
  }
}
