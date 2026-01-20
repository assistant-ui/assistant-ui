import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import z from "zod";
import { searchDocs } from "@/lib/vector";
import { source } from "@/lib/source";
import { getLLMText } from "@/lib/get-llm-text";
import type * as PageTree from "fumadocs-core/page-tree";

export const maxDuration = 30;

const isDev = process.env.NODE_ENV === "development";

// Helper functions for browseDocs tool
function findFolderByPath(
  tree: PageTree.Root,
  path: string,
): PageTree.Folder | null {
  const segments = path.split("/").filter(Boolean);
  let current: PageTree.Node[] = tree.children;
  let folder: PageTree.Folder | null = null;

  for (const seg of segments) {
    folder =
      current.find(
        (n): n is PageTree.Folder =>
          n.type === "folder" &&
          (n.index?.url?.includes(`/${seg}`) ||
            (typeof n.name === "string" &&
              n.name.toLowerCase() === seg.toLowerCase())),
      ) ?? null;
    if (!folder) return null;
    current = folder.children;
  }
  return folder;
}

function countPages(folder: PageTree.Folder): number {
  return folder.children.reduce(
    (acc, node) => {
      if (node.type === "page") return acc + 1;
      if (node.type === "folder") return acc + countPages(node);
      return acc;
    },
    folder.index ? 1 : 0,
  );
}

const getRatelimit = async () => {
  if (isDev) return null;
  const { kv } = await import("@vercel/kv");
  const { Ratelimit } = await import("@upstash/ratelimit");
  return new Ratelimit({
    redis: kv,
    limiter: Ratelimit.fixedWindow(5, "30s"),
  });
};

const ratelimitPromise = getRatelimit();

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
You have three documentation tools:

1. **searchDocs** - Semantic search across all docs
   - Best for: finding pages by concept/keyword
   - Returns: snippets with titles and URLs

2. **browseDocs** - Explore documentation structure
   - Best for: understanding what's available, finding related pages
   - Use with no path for root categories, or specify path (e.g., "ui")
   - Returns: list of pages/folders at that level

3. **readDoc** - Read full page content
   - Best for: getting complete information after identifying the right page
   - Input: slug like "ui/thread"
   - Returns: full processed page content

**Recommended patterns:**
- Specific question → searchDocs → readDoc for full context
- Exploring options → browseDocs → readDoc relevant pages
- "What can I do with X?" → browseDocs(X category) → summarize

Choose the most appropriate tool based on the question. No default preference.
</tools>

<answering>
- Use the documentation tools to find relevant information
- Cite doc URLs when referencing specific pages
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
  const { messages, tools } = await req.json();

  const ratelimit = await ratelimitPromise;
  if (ratelimit) {
    const ip = req.headers.get("x-forwarded-for") ?? "ip";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return new Response("Rate limit exceeded", { status: 429 });
    }
  }

  const prunedMessages = pruneMessages({
    messages: convertToModelMessages(messages),
    toolCalls: "before-last-2-messages",
    reasoning: "none",
    emptyMessages: "remove",
  });

  const result = streamText({
    model: openai("gpt-5-nano"),
    system: SYSTEM_PROMPT,
    messages: prunedMessages,
    stopWhen: stepCountIs(20),
    tools: {
      ...frontendTools(tools),
      searchDocs: tool({
        description: "Search assistant-ui documentation",
        inputSchema: z.object({
          query: z.string().describe("Search query"),
        }),
        execute: async ({ query }) => {
          const results = await searchDocs(query, 3);
          return results.map((r) => ({
            title: r.metadata?.title,
            url: r.metadata?.url,
            content: r.metadata?.content,
          }));
        },
      }),
      browseDocs: tool({
        description: "Browse documentation structure at a given path",
        inputSchema: z.object({
          path: z
            .string()
            .optional()
            .describe(
              "Path to browse (e.g., 'ui', 'runtimes'). Empty for root.",
            ),
        }),
        execute: async ({ path }) => {
          const pageTree = source.pageTree;

          if (!path) {
            // Return root categories
            return pageTree.children
              .filter((node): node is PageTree.Folder => node.type === "folder")
              .map((folder) => ({
                name: folder.name,
                path: folder.index?.url?.replace("/docs/", "") ?? "",
                pageCount: countPages(folder),
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
                  path: node.index?.url?.replace("/docs/", "") ?? "",
                };
              case "separator":
                return { type: "separator", name: node.name };
              default:
                return [];
            }
          });
        },
      }),
      readDoc: tool({
        description: "Read full content of a documentation page",
        inputSchema: z.object({
          slugOrUrl: z
            .string()
            .describe("Page slug (e.g., 'ui/thread') or URL"),
        }),
        execute: async ({ slugOrUrl }) => {
          let path = slugOrUrl;
          if (
            slugOrUrl.startsWith("http://") ||
            slugOrUrl.startsWith("https://")
          ) {
            try {
              path = new URL(slugOrUrl).pathname;
            } catch {
              return { error: `Invalid URL: ${slugOrUrl}` };
            }
          }
          const normalized = path.replace(/^\/docs\/?/, "");
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
      if (part.type === "finish") {
        return { custom: { usage: part.totalUsage } };
      }
      return undefined;
    },
  });
}
