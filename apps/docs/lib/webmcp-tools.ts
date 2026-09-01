// The local API types follow webmachinelearning/webmcp@41d12f057167ccf5954dbcf49d99502cb6c84491
// and were exercised in Chrome 151. The draft has already moved attachment
// points, so the API is feature-detected rather than added to global types.

import {
  SEARCH_DOCS_RESULT_LIMIT,
  readPageTool,
  searchDocsTool,
} from "@/lib/mcp-tool-definitions";

type WebMcpToolResult = {
  content: { type: string; text?: string }[];
  isError?: boolean;
};

type WebMcpToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
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

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

// Cancellation must reach the caller untouched so an abort it requested stays
// distinguishable from a transport or parse failure.
function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

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
    if (isAbortError(error)) throw error;
    throw new Error(
      `Docs request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new Error(`Docs request failed with status ${response.status}`);
  }

  let payload;
  try {
    payload = (await response.json()) as {
      result?: WebMcpToolResult;
      error?: { message?: string };
    } | null;
  } catch (error) {
    // fetch resolves once headers arrive, so an abort while the body is still
    // streaming surfaces here rather than at the request above.
    if (isAbortError(error)) throw error;
    throw new Error("Docs request returned invalid JSON");
  }
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Docs request returned an unexpected response");
  }
  if (payload.error) {
    throw new Error(payload.error.message ?? "Docs request failed");
  }
  if (!Array.isArray(payload.result?.content)) {
    throw new Error("Docs request returned an unexpected response");
  }
  // The route reports tool-level failures (e.g. page not found) as MCP
  // isError results on a 200; pass those through unchanged.
  return payload.result.isError
    ? { isError: true, content: payload.result.content }
    : { content: payload.result.content };
}

// Chrome's native WebMCP discards a rejected execute's value and reports
// every rejection as a generic "Tool was executed but the invocation
// failed", while it JSON-serializes a resolved object whole. A failure
// therefore keeps its text only by resolving as an isError result. Abort
// rejections still propagate so a cancellation the caller requested stays
// a rejection rather than a tool error.
const withErrorResults =
  (execute: WebMcpToolDescriptor["execute"]): WebMcpToolDescriptor["execute"] =>
  async (args, context) => {
    try {
      return await execute(args, context);
    } catch (error) {
      if (isAbortError(error)) throw error;
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  };

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

function examplePath(path: string) {
  let normalized = path;
  // read_page accepts same-origin URLs; map them to their pathname before
  // prefixing so a URL read off the page doesn't become examples/https://...
  // Cross-origin URLs pass through untouched so the route's own same-origin
  // check rejects them instead of silently reading a local page.
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      if (
        typeof window !== "undefined" &&
        parsed.origin !== window.location.origin
      ) {
        return path;
      }
      normalized = parsed.pathname;
    } catch {
      return path;
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
      description: `${searchDocsTool.description} Returns up to ${SEARCH_DOCS_RESULT_LIMIT} matching pages.`,
      inputSchema: searchDocsTool.inputSchema,
      annotations: { readOnlyHint: true },
      execute: async (args, context) => {
        const query = stringArg(args, "query");
        if (!query) throw new Error("query is required");
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
        "Read one assistant-ui docs or Tap docs page as markdown. Accepts a path such as /docs/installation or tap/docs/store/state.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Docs or Tap page path such as /docs/installation or tap/docs/store/state, or a same-origin URL for one of those pages.",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args, context) => {
        const path = stringArg(args, "path");
        if (!path) throw new Error("path is required");
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
            description:
              "Example slug such as ai-sdk, /examples/<slug> path, or a same-origin URL under /examples/.",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args, context) => {
        const path = stringArg(args, "path");
        if (!path) throw new Error("path is required");
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
      modelContext.registerTool(
        { ...tool, execute: withErrorResults(tool.execute) },
        { signal: controller.signal },
      ),
    ).catch((error) => {
      // Registration failures (permissions policy, duplicate names, spec
      // drift) must not break the page, but should be visible in development.
      if (process.env.NODE_ENV !== "production") {
        console.warn(`WebMCP: failed to register ${tool.name}`, error);
      }
    });
  }
  return () => {
    controller.abort();
  };
}
