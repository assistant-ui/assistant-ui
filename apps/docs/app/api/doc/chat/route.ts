import { getLLMText } from "@/lib/get-llm-text";
import { getDistinctId, posthogServer } from "@/lib/posthog-server";
import { injectQuoteContext } from "@/lib/quote";
import { checkRateLimit } from "@/lib/rate-limit";
import { source } from "@/lib/source";
import { getModel } from "@/lib/ai/provider";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { withTracing } from "@posthog/ai";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  tool,
  zodSchema,
} from "ai";
import type * as PageTree from "fumadocs-core/page-tree";
import z from "zod";

function normalizeSegment(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function findFolderByPath(
  tree: PageTree.Root,
  path: string,
): PageTree.Folder | undefined {
  const segments = path.split("/").filter(Boolean);
  let currentFolder: PageTree.Folder | undefined;
  let children: PageTree.Node[] = tree.children;

  for (const segment of segments) {
    const folder = children.find(
      (node): node is PageTree.Folder =>
        node.type === "folder" &&
        normalizeSegment(typeof node.name === "string" ? node.name : "") ===
          segment.toLowerCase(),
    );
    if (!folder) return undefined;
    currentFolder = folder;
    children = folder.children;
  }

  return currentFolder;
}

export const maxDuration = 300;

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
- Provide code snippets when they help clarify
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
   - Use with path (e.g., "ui", "runtimes") to see pages in that section
   - Returns: list of folders and pages with URLs

2. **readDoc** - Read a specific documentation page
   - Input: slug (e.g., "ui/thread") or URL (e.g., "/docs/ui/thread")
   - Returns: full page content

**Recommended patterns:**
- User asks a question → listDocs to find relevant section → readDoc to get content
- User mentions a specific path → readDoc directly
</tools>

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
    const { messages, tools, system: pageContext, config } = body;

    const prunedMessages = pruneMessages({
      messages: await convertToModelMessages(injectQuoteContext(messages)),
      toolCalls: "before-last-2-messages",
      reasoning: "none",
      emptyMessages: "remove",
    });

    const baseModel = getModel(config?.modelName);

    const tracedModel = posthogServer
      ? withTracing(baseModel, posthogServer, {
          posthogDistinctId: getDistinctId(req),
          posthogPrivacyMode: false,
          posthogProperties: {
            $ai_span_name: "docs_assistant_chat",
            source: "docs_assistant",
          },
        })
      : baseModel;

    const result = streamText({
      model: tracedModel,
      system: [SYSTEM_PROMPT, pageContext].filter(Boolean).join("\n\n"),
      messages: prunedMessages,
      stopWhen: stepCountIs(25),
      tools: {
        ...frontendTools(tools),
        listDocs: tool({
          description:
            "List documentation pages. Use with no path for root categories, or specify path to browse a section.",
          inputSchema: zodSchema(
            z.object({
              path: z
                .string()
                .optional()
                .describe(
                  "Path to browse (e.g., 'ui', 'runtimes'). Empty for root.",
                ),
            }),
          ),
          execute: async ({ path }) => {
            const pageTree = source.pageTree;

            if (!path) {
              // Return root categories
              return pageTree.children
                .filter(
                  (node): node is PageTree.Folder => node.type === "folder",
                )
                .map((folder) => ({
                  type: "folder",
                  name: folder.name,
                  ...(folder.index ? { url: folder.index.url } : {}),
                }));
            }

            // Find folder at path, return children
            const targetFolder = findFolderByPath(pageTree, path);
            if (!targetFolder) return { error: "Path not found" };

            return targetFolder.children.flatMap((node) => {
              switch (node.type) {
                case "page":
                  return { type: "page", title: node.name, url: node.url };
                case "folder":
                  return {
                    type: "folder",
                    name: node.name,
                    ...(node.index ? { url: node.index.url } : {}),
                  };
                default:
                  return [];
              }
            });
          },
        }),
        readDoc: tool({
          description: "Read full content of a documentation page",
          inputSchema: zodSchema(
            z.object({
              slugOrUrl: z
                .string()
                .describe("Page slug (e.g., 'ui/thread') or URL"),
            }),
          ),
          execute: async ({ slugOrUrl }) => {
            const path = slugOrUrl.startsWith("http")
              ? new URL(slugOrUrl).pathname
              : slugOrUrl;

            const normalized = path.replace(/^(\/docs\/|docs\/)+/, "");
            const slugs = normalized.split("/").filter(Boolean);

            const page = source.getPage(slugs);
            if (!page) return { error: `Page not found: ${slugOrUrl}` };

            const content = await getLLMText(page);
            return { title: page.data.title, url: page.url, content };
          },
        }),
      },
      onError: console.error,
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
    return new Response(e instanceof Error ? e.message : "Unknown error", {
      status: 500,
    });
  }
}
