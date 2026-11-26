import { prepareDocChatMessages, streamDocsChat } from "@/lib/ai/chat-route";
import { checkPublicAssistantRateLimit } from "@/lib/rate-limit";
import { requirePublicAssistantSession } from "@/lib/anonymous-session";
import {
  validateDocChatInput,
  validateFrontendToolsInput,
} from "@/lib/validate-input";
import { listDocs, readDoc } from "@/lib/ai/docs-tools";
import { resolveChatModel } from "@/lib/ai/provider";
import { getSession } from "@/lib/accounts-auth";
import { toPublicStreamError } from "@/lib/ai/model-provider-errors";
import { frontendTools } from "@assistant-ui/ai-sdk";
import { createRepoSandbox } from "@/lib/repo-sandbox";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  tool,
  zodSchema,
} from "ai";
import type { UIMessageChunk } from "ai";
import z from "zod";

export const maxDuration = 300;

const MAX_PAGE_CONTEXT_CHARS = 4_000;

export async function* withReadDocSources(
  chunks: AsyncIterable<UIMessageChunk>,
): AsyncGenerator<UIMessageChunk> {
  const toolNameByCall = new Map<string, string>();
  const sourceUrls = new Set<string>();

  for await (const chunk of chunks) {
    yield chunk;

    if (chunk.type === "tool-input-available") {
      toolNameByCall.set(chunk.toolCallId, chunk.toolName);
    }

    if (
      chunk.type === "tool-output-available" &&
      toolNameByCall.get(chunk.toolCallId) === "readDoc"
    ) {
      const output = chunk.output as { title?: unknown; url?: unknown };
      if (typeof output.url === "string" && !sourceUrls.has(output.url)) {
        sourceUrls.add(output.url);
        yield {
          type: "source-url",
          sourceId: chunk.toolCallId,
          url: output.url,
          ...(typeof output.title === "string" ? { title: output.title } : {}),
        };
      }
    }
  }
}

function createRepoTools() {
  const getBashToolkit = createRepoSandbox();

  return {
    bash: tool({
      description:
        "Execute bash commands in the /repo sandbox containing the assistant-ui monorepo.",
      inputSchema: zodSchema(
        z.object({
          command: z
            .string()
            .describe("The bash command to execute from the /repo directory."),
        }),
      ),
      execute: async ({ command }, options) => {
        const { tools } = await getBashToolkit();
        return tools.bash.execute!({ command }, options);
      },
    }),
    readFile: tool({
      description: "Read the contents of a source file from the /repo sandbox.",
      inputSchema: zodSchema(
        z.object({
          path: z
            .string()
            .describe("The repo-relative file path to read from /repo."),
        }),
      ),
      execute: async ({ path }, options) => {
        const { tools } = await getBashToolkit();
        return tools.readFile.execute!({ path }, options);
      },
    }),
  };
}

const SYSTEM_PROMPT = `You are the assistant-ui docs assistant.

<about_assistant_ui>
assistant-ui is a React library for building AI chat interfaces. It provides:
- Composable UI primitives (Thread, Composer, Message, etc.)
- Runtime adapters for AI backends (Vercel AI SDK, LangGraph, custom stores)
- Pre-built components with full customization support
</about_assistant_ui>

<personality>
- Friendly, concise, developer-focused
- Answer the actual question - don't list documentation sections
- Use emoji sparingly (👋 for greetings, ✅ for success, etc.)
- Link to relevant docs naturally within answers
</personality>

<greetings>
When users send a casual greeting (hey, hi, hello):
1. Welcome them to assistant-ui with emoji 👋
2. Briefly explain what assistant-ui helps them do (build AI chat interfaces in React)
3. Ask what they're working on or offer 2-3 common starting points

Example tone:
"Hey! 👋 Welcome to assistant-ui!

I'm here to help you build AI chat interfaces with React. Whether you're just getting started, connecting to an AI backend, or customizing components — I've got you covered.

What are you working on?"

Do NOT dump all documentation categories. Keep it conversational.
</greetings>

<tools>
You have two documentation tools:

1. **listDocs** - Browse documentation structure
   - Use with no path for root categories
   - Use with path (e.g., "runtimes", "guides", "elements") to see pages in that section
   - Returns: list of folders and pages with URLs

2. **readDoc** - Read a specific documentation page
   - Input: slug (e.g., "guides/attachments") or URL (e.g., "/elements/thread")
   - Returns: full page content

**Recommended patterns:**
- User asks a question → listDocs to find relevant section → readDoc to get content
- User mentions a specific path → readDoc directly
</tools>

<source_code_tools>
You also have tools for exploring the actual assistant-ui source code:

3. **bash** - Execute bash commands in a sandbox containing the full monorepo
   - The sandbox is at /repo with the complete source tree
   - Use for: grep, find, cat, awk, head, tail, wc, ls, tree, etc.
   - Example: \`grep -r "useThread" packages/ --include="*.ts" -l\`

4. **readFile** - Read a specific source file by path
   - More token-efficient than \`cat\` for reading whole files
</source_code_tools>

<answering>
- Use the documentation tools to find relevant information
- **CRITICAL: ONLY use URLs that are explicitly returned by your tools**
- **NEVER guess or fabricate URLs** - if a tool didn't return a URL, don't link to it
- When linking, copy the exact URL from tool results: [Page Title](/docs/exact-path-from-tool)
- Prefer not linking over linking to a potentially non-existent page
- Admit uncertainty rather than guessing
</answering>

<answer_style>
- Default to a direct answer in 3 to 5 sentences; expand only when the question genuinely needs it
- Include code only when the user asks for code, or when a snippet under 15 lines replaces a paragraph of explanation
- Show only the lines that matter (the prop, the hook call, the config entry), never whole files or complete documentation examples
- When a full example already exists in the docs, link to it instead of pasting it: "Full example: [Attachments](/docs/guides/attachments)"
- The pages you read are listed automatically as clickable sources under your reply, so do not append a link list at the end
- For multi-step setups, give short prose steps with links, and expand code for at most the step the user is currently on
</answer_style>

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
    const session = requirePublicAssistantSession(req);
    if (session instanceof Response) return session;

    const rateLimitResponse = await checkPublicAssistantRateLimit(
      req,
      session.id,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const { messages, tools, system: rawPageContext, config } = body;

    if (
      typeof rawPageContext === "string" &&
      rawPageContext.length > MAX_PAGE_CONTEXT_CHARS
    ) {
      return new Response("Page context too long", { status: 400 });
    }
    const pageContext =
      typeof rawPageContext === "string" ? rawPageContext : undefined;

    const toolsError = validateFrontendToolsInput(tools);
    if (toolsError) return toolsError;

    const clientTools = frontendTools(tools ?? {});
    const prunedMessages = await prepareDocChatMessages(messages, clientTools);

    const inputError = validateDocChatInput(prunedMessages);
    if (inputError) return inputError;

    const signedIn = (await getSession().catch(() => null)) !== null;
    const modelConfig = resolveChatModel(
      { modelName: config?.modelName },
      { signedIn },
    );

    const repoTools = createRepoTools();

    const { result, messageMetadata } = streamDocsChat(
      req,
      modelConfig,
      {
        spanName: "docs_assistant_chat",
        source: "docs_assistant",
      },
      {
        system: [SYSTEM_PROMPT, pageContext].filter(Boolean).join("\n\n"),
        messages: prunedMessages,
        maxOutputTokens: 8192,
        stopWhen: stepCountIs(25),
        tools: {
          ...clientTools,
          ...repoTools,
          listDocs: tool({
            description:
              "List documentation pages. Use with no path for root categories, or specify path to browse a section.",
            inputSchema: zodSchema(
              z.object({
                path: z
                  .string()
                  .optional()
                  .describe(
                    "Path to browse (e.g., 'runtimes', 'runtimes/ai-sdk', 'elements'). Empty for root.",
                  ),
              }),
            ),
            execute: async ({ path }) => listDocs(path),
          }),
          readDoc: tool({
            description: "Read full content of a documentation page",
            inputSchema: zodSchema(
              z.object({
                slugOrUrl: z
                  .string()
                  .describe(
                    "Page slug (e.g., 'guides/attachments', 'elements/thread') or URL",
                  ),
              }),
            ),
            execute: async ({ slugOrUrl }) => readDoc(slugOrUrl, req.url),
          }),
        },
      },
    );

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        for await (const chunk of withReadDocSources(
          result.toUIMessageStream({
            originalMessages: messages,
            messageMetadata: ({ part }) => {
              if (part.type === "finish") {
                return { custom: { usage: part.totalUsage } };
              }
              return messageMetadata({ part });
            },
            onError: toPublicStreamError,
          }),
        )) {
          writer.write(chunk);
        }
      },
      onError: toPublicStreamError,
    });

    return createUIMessageStreamResponse({ stream });
  } catch (e) {
    console.error("[api/doc/chat]", e);
    return new Response("Request failed", { status: 500 });
  }
}
