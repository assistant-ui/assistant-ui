// WebMCP (https://github.com/webmachinelearning/webmcp) is an early W3C CG
// draft that has already moved attachment points (navigator.modelContext ->
// document.modelContext), so the API surface is feature-detected and typed
// locally. Chrome additionally gates it behind an origin trial through Chrome
// 156; the Origin-Trial header wiring lives in next.config.ts.

import {
  SEARCH_DOCS_RESULT_LIMIT,
  readPageTool,
  searchDocsTool,
} from "@/app/api/mcp/tool-definitions";

type WebMcpToolResult = {
  content: { type: string; text?: string }[];
  isError?: boolean;
};

type WebMcpToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    args: Record<string, unknown>,
    context?: { signal?: AbortSignal },
  ) => Promise<WebMcpToolResult>;
};

export type WebMcpModelContext = {
  registerTool: (
    tool: WebMcpToolDescriptor,
    options?: { signal?: AbortSignal },
  ) => Promise<void> | void;
};

export function getWebMcpModelContext(): WebMcpModelContext | undefined {
  if (typeof window === "undefined") return undefined;
  const documentContext = (document as { modelContext?: WebMcpModelContext })
    .modelContext;
  if (documentContext?.registerTool) return documentContext;
  const navigatorContext = (navigator as { modelContext?: WebMcpModelContext })
    .modelContext;
  if (navigatorContext?.registerTool) return navigatorContext;
  return undefined;
}

function errorResult(text: string): WebMcpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

async function callMcpRoute(
  fetchImpl: FetchLike,
  toolName: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<WebMcpToolResult> {
  let response;
  try {
    response = await fetchImpl("/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    return errorResult(
      `Docs request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    return errorResult(`Docs request failed with status ${response.status}`);
  }

  let payload;
  try {
    payload = (await response.json()) as {
      result?: WebMcpToolResult;
      error?: { message?: string };
    } | null;
  } catch {
    return errorResult("Docs request returned invalid JSON");
  }
  if (typeof payload !== "object" || payload === null) {
    return errorResult("Docs request returned an unexpected response");
  }
  if (payload.error) {
    return errorResult(payload.error.message ?? "Docs request failed");
  }
  if (!Array.isArray(payload.result?.content)) {
    return errorResult("Docs request returned an unexpected response");
  }
  return payload.result;
}

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

function examplePath(path: string) {
  let normalized = path;
  // read_page accepts same-origin URLs; map them to their pathname before
  // prefixing so a URL read off the page doesn't become examples/https://...
  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      // leave it for the server to reject
    }
  }
  while (normalized.startsWith("/")) normalized = normalized.slice(1);
  return normalized === "examples" || normalized.startsWith("examples/")
    ? normalized
    : `examples/${normalized}`;
}

function webMcpTools(fetchImpl: FetchLike): WebMcpToolDescriptor[] {
  return [
    {
      name: "searchDocs",
      description: `Search the assistant-ui documentation, examples, and Tap docs by title, description, or URL. Returns up to ${SEARCH_DOCS_RESULT_LIMIT} matching pages.`,
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
        },
        required: ["query"],
        additionalProperties: false,
      },
      execute: async (args, context) => {
        const query = stringArg(args, "query");
        if (!query) return errorResult("query is required");
        return callMcpRoute(
          fetchImpl,
          searchDocsTool.name,
          { query },
          context?.signal,
        );
      },
    },
    {
      name: "getDoc",
      description:
        "Read one assistant-ui docs or Tap docs page as markdown. Accepts a path such as /docs/getting-started or tap/docs/store/state.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Page path such as /docs/getting-started or tap/docs/store/state.",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      execute: async (args, context) => {
        const path = stringArg(args, "path");
        if (!path) return errorResult("path is required");
        return callMcpRoute(
          fetchImpl,
          readPageTool.name,
          { path },
          context?.signal,
        );
      },
    },
    {
      name: "getExample",
      description:
        "Read one assistant-ui example page as markdown. Accepts an example slug such as ai-sdk or a path such as /examples/ai-sdk.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Example slug or path such as /examples/ai-sdk.",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      execute: async (args, context) => {
        const path = stringArg(args, "path");
        if (!path) return errorResult("path is required");
        return callMcpRoute(
          fetchImpl,
          readPageTool.name,
          { path: examplePath(path) },
          context?.signal,
        );
      },
    },
  ];
}

export function registerWebMcpTools(
  modelContext: WebMcpModelContext,
  fetchImpl: FetchLike,
): () => void {
  const controller = new AbortController();
  for (const tool of webMcpTools(fetchImpl)) {
    Promise.resolve(
      modelContext.registerTool(tool, { signal: controller.signal }),
    ).catch(() => {});
  }
  return () => {
    controller.abort();
  };
}
