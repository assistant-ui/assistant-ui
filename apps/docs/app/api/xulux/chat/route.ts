import { getLLMText } from "@/lib/get-llm-text";
import { getDistinctId, posthogServer } from "@/lib/posthog-server";
import { createPrismTracer } from "@/lib/prism-server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { injectQuoteContext } from "@assistant-ui/react-ai-sdk";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateDocChatInput } from "@/lib/validate-input";
import { source, examples as examplesSource } from "@/lib/source";
import { getModel } from "@/lib/ai/provider";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { createBashTool } from "bash-tool";
import { prismAISDK } from "@aui-x/prism";
import { withTracing } from "@posthog/ai";
import {
  provisionSandbox,
  fetchPreviewUrl,
  type SandboxExec,
} from "../blaxel-sandbox";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  tool,
  zodSchema,
} from "ai";
import type * as PageTree from "fumadocs-core/page-tree";
import type { UIMessage } from "ai";
import z from "zod";

const SOURCE_SNAPSHOT_PATH = path.join(
  process.cwd(),
  "generated",
  "source-snapshot.json",
);

function loadSourceSnapshot(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(SOURCE_SNAPSHOT_PATH, "utf-8")) as Record<
      string,
      string
    >;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.warn(
        `Missing source snapshot at ${SOURCE_SNAPSHOT_PATH}; repo tools will be unavailable until generate:docs runs.`,
      );
      return {};
    }

    throw error;
  }
}

const SOURCE_SNAPSHOT = loadSourceSnapshot();

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

const DOCS_PATH_ERROR = "Only local docs paths are supported";

function normalizeDocPath(slugOrUrl: string, routeUrl: string): string {
  const raw = slugOrUrl.trim();
  if (!raw) {
    throw new Error("Slug/path is required");
  }

  const current = new URL(routeUrl);
  const isAbsoluteUrl = /^https?:\/\//i.test(raw);

  if (!isAbsoluteUrl) {
    const cleaned = raw.replace(/^\/+/, "").replace(/^docs\//, "");
    if (!cleaned || cleaned.includes("..")) {
      throw new Error(DOCS_PATH_ERROR);
    }
    return cleaned;
  }

  const resolved = new URL(raw);
  if (resolved.origin !== current.origin) {
    throw new Error(DOCS_PATH_ERROR);
  }

  const cleaned = resolved.pathname.replace(/^\/+/, "").replace(/^docs\//, "");
  if (!cleaned || cleaned.includes("..")) {
    throw new Error(DOCS_PATH_ERROR);
  }

  return cleaned;
}

export const maxDuration = 300;

const PRUNE_OPTIONS = {
  toolCalls: "before-last-2-messages",
  reasoning: "none",
  emptyMessages: "remove",
} as const;

async function prepareMessages(messages: readonly UIMessage[]) {
  const modelMessages = await convertToModelMessages(
    injectQuoteContext([...messages]),
  );
  return pruneMessages({ messages: modelMessages, ...PRUNE_OPTIONS });
}

function createRepoTools() {
  let bashToolkitPromise: Promise<
    Awaited<ReturnType<typeof createBashTool>>
  > | null = null;

  const getBashToolkit = () => {
    if (!bashToolkitPromise) {
      bashToolkitPromise = createBashTool({
        files: SOURCE_SNAPSHOT,
        destination: "/repo",
        maxFiles: 5000,
        maxOutputLength: 15000,
      });
    }
    return bashToolkitPromise;
  };

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
You have tools to explore docs/examples, read the monorepo source, and operate a live sandbox.

**Phase 1 — Discovery (before writing any code):**
1. **listDocs** - Browse docs or examples structure
   - \`listDocs()\` → root categories
   - \`listDocs({ path: "examples" })\` → available example projects
   - \`listDocs({ path: "runtimes" })\` → a docs section
2. **readDoc** - Read a page in full (slug like \`"examples/ai-sdk"\` or \`"ui/thread"\`)
3. **bash** / **readFile** - Explore the static monorepo snapshot at /repo
   - Find template source files: \`find templates/ -type f\`
   - Read them before scaffolding so you copy real, working code

**Phase 2 — Scaffold into the live sandbox:**
4. **provisionSandbox** - Call this once before using the sandbox. Pass the sessionId from the request.
   - Creates (or resumes) a cloud sandbox tied to this session
5. **exec** - Run any shell command in the live sandbox
   - Write files: \`printf '%s' "$CONTENT" > /workspace/file.ts\` or use \`tee\`
   - Read files: \`cat /workspace/file.ts\`
   - Install deps: \`cd /workspace && npm install\`
   - Start dev server as a background: \`cd /workspace && npm run dev -- --host 0.0.0.0 --port 3000\` (must bind to 0.0.0.0)
   - All standard shell tools available: grep, find, ls, tree, etc.

**Recommended pattern:**
1. \`listDocs({ path: "examples" })\` → find closest example
2. \`readDoc\` the example page → understand the structure
3. \`bash\` to read the matching template source from /repo
4. \`provisionSandbox\` → get the live sandbox ready
5. \`exec\` to scaffold files, install deps, and start the preview
6. \`refreshCanvas\` → send the preview URL to the client
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
    const { messages, tools, system: pageContext, config, sessionId } = body;

    let sandboxExec: SandboxExec | null = null;

    const prunedMessages = await prepareMessages(messages);

    const inputError = validateDocChatInput(prunedMessages);
    if (inputError) return inputError;

    const baseModel = getModel(config?.modelName);
    const distinctId = getDistinctId(req);
    const prismTracer = createPrismTracer();

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
        })
      : null;

    const repoTools = createRepoTools();

    const flatNodes = (nodes: PageTree.Node[]) =>
      nodes.flatMap((node) => {
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

    const result = streamText({
      model: prism?.model ?? posthogModel,
      system: [SYSTEM_PROMPT, pageContext].filter(Boolean).join("\n\n"),
      messages: prunedMessages,
      maxOutputTokens: 8192,
      stopWhen: stepCountIs(25),
      tools: {
        ...frontendTools(tools),
        ...repoTools,
        provisionSandbox: tool({
          description:
            "Provision (or resume) the cloud sandbox for this session. Call this once before using exec.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            if (!sessionId) {
              return { error: "No sessionId provided in the request body." };
            }
            try {
              const sandbox = await provisionSandbox(sessionId);
              sandboxExec = sandbox.exec;
              return {
                status: "ready",
                workingDir: "/workspace",
                previewUrl: sandbox.previewUrl,
              };
            } catch (err) {
              return {
                error: err instanceof Error ? err.message : String(err),
              };
            }
          },
        }),
        refreshCanvas: tool({
          description:
            "Fetch the live preview URL from the sandbox and return it to the client to refresh the canvas. Call after starting the dev server or making changes.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            if (!sessionId) return { error: "No sessionId in request." };
            try {
              const url = await fetchPreviewUrl(sessionId);
              return { url };
            } catch (err) {
              return {
                error: err instanceof Error ? err.message : String(err),
              };
            }
          },
        }),
        exec: tool({
          description:
            "Run a shell command in the live sandbox. Use this to read/write files, install deps, start servers, etc.",
          inputSchema: zodSchema(
            z.object({
              command: z.string().describe("Shell command to run."),
              cwd: z
                .string()
                .optional()
                .describe("Working directory (default: /workspace)."),
            }),
          ),
          execute: async ({ command, cwd }) => {
            if (!sandboxExec) {
              return { error: "Call provisionSandbox first." };
            }
            return sandboxExec(command, cwd);
          },
        }),
        listDocs: tool({
          description:
            "List documentation or example pages. Use with no path for root categories, 'examples' for example projects, or a doc section path like 'runtimes'.",
          inputSchema: zodSchema(
            z.object({
              path: z
                .string()
                .optional()
                .describe(
                  "Path to browse (e.g., 'examples', 'ui', 'runtimes'). Empty for root.",
                ),
            }),
          ),
          execute: async ({ path }) => {
            if (path === "examples" || path?.startsWith("examples/")) {
              const tree = examplesSource.pageTree;
              if (path === "examples") return flatNodes(tree.children);
              const sub = path.slice("examples/".length);
              const folder = findFolderByPath(tree, sub);
              if (!folder) return { error: "Path not found" };
              return flatNodes(folder.children);
            }

            const pageTree = source.pageTree;

            if (!path) {
              return [
                ...pageTree.children
                  .filter(
                    (node): node is PageTree.Folder => node.type === "folder",
                  )
                  .map((folder) => ({
                    type: "folder",
                    name: folder.name,
                    ...(folder.index ? { url: folder.index.url } : {}),
                  })),
                { type: "folder", name: "Examples", url: "/examples" },
              ];
            }

            const targetFolder = findFolderByPath(pageTree, path);
            if (!targetFolder) return { error: "Path not found" };
            return flatNodes(targetFolder.children);
          },
        }),
        readDoc: tool({
          description:
            "Read full content of a documentation or example page. Use slugs like 'examples/ai-sdk' or 'ui/thread'.",
          inputSchema: zodSchema(
            z.object({
              slugOrUrl: z
                .string()
                .describe(
                  "Page slug (e.g., 'examples/ai-sdk', 'ui/thread') or URL",
                ),
            }),
          ),
          execute: async ({ slugOrUrl }) => {
            let normalized: string;
            try {
              normalized = normalizeDocPath(slugOrUrl, req.url);
            } catch (error) {
              return {
                error:
                  error instanceof Error ? error.message : "Invalid docs path",
              };
            }

            if (normalized.startsWith("examples/")) {
              const slugs = normalized
                .slice("examples/".length)
                .split("/")
                .filter(Boolean);
              const page = examplesSource.getPage(slugs);
              if (!page) return { error: `Page not found: ${slugOrUrl}` };
              const content = await getLLMText(page);
              return { title: page.data.title, url: page.url, content };
            }

            const slugs = normalized.split("/").filter(Boolean);
            const page = source.getPage(slugs);
            if (!page) return { error: `Page not found: ${slugOrUrl}` };
            const content = await getLLMText(page);
            return { title: page.data.title, url: page.url, content };
          },
        }),
      },
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
