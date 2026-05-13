import { getLLMText } from "@/lib/get-llm-text";
import { source, examples as examplesSource } from "@/lib/source";
import { readFileSync } from "node:fs";
import path from "node:path";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { createBashTool } from "bash-tool";
import { tool, zodSchema } from "ai";
import type * as PageTree from "fumadocs-core/page-tree";
import z from "zod";
import {
  fetchPreviewUrl,
  provisionSandbox,
  type SandboxExec,
} from "../blaxel-sandbox";

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

const DOCS_PATH_ERROR = "Only local docs paths are supported";
let sourceSnapshot: Record<string, string> | null = null;

function getSourceSnapshot() {
  if (!sourceSnapshot || Object.keys(sourceSnapshot).length === 0) {
    sourceSnapshot = loadSourceSnapshot();
  }
  return sourceSnapshot;
}

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

function createRepoTools() {
  let bashToolkitPromise: Promise<
    Awaited<ReturnType<typeof createBashTool>>
  > | null = null;

  const getBashToolkit = () => {
    if (!bashToolkitPromise) {
      bashToolkitPromise = createBashTool({
        files: getSourceSnapshot(),
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

export function createXuluxChatTools({
  clientTools,
  sessionId,
  routeUrl,
}: {
  clientTools: Parameters<typeof frontendTools>[0];
  sessionId: string | undefined;
  routeUrl: string;
}) {
  let sandboxExec: SandboxExec | null = null;

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

  return {
    ...frontendTools(clientTools),
    ...createRepoTools(),
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
        let normalizedPath: string | undefined;
        try {
          normalizedPath = path ? normalizeDocPath(path, routeUrl) : undefined;
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : "Invalid docs path",
          };
        }

        if (
          normalizedPath === "examples" ||
          normalizedPath?.startsWith("examples/")
        ) {
          const tree = examplesSource.pageTree;
          if (normalizedPath === "examples") return flatNodes(tree.children);
          const sub = normalizedPath.slice("examples/".length);
          const folder = findFolderByPath(tree, sub);
          if (!folder) return { error: "Path not found" };
          return flatNodes(folder.children);
        }

        const pageTree = source.pageTree;

        if (!normalizedPath) {
          return [
            ...pageTree.children
              .filter((node): node is PageTree.Folder => node.type === "folder")
              .map((folder) => ({
                type: "folder",
                name: folder.name,
                ...(folder.index ? { url: folder.index.url } : {}),
              })),
            { type: "folder", name: "Examples", url: "/examples" },
          ];
        }

        const targetFolder = findFolderByPath(pageTree, normalizedPath);
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
          normalized = normalizeDocPath(slugOrUrl, routeUrl);
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : "Invalid docs path",
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
  };
}
