/**
 * WebMCP (https://github.com/webmachinelearning/webmcp) tool registration for
 * the docs site. Browsing agents (Chrome's origin trial, the ChatGPT desktop
 * browser) discover tools registered on `document.modelContext` and call them
 * instead of scraping HTML. The tools proxy to the existing /api/mcp route, so
 * search and page content stay server-side and the client bundle carries no
 * docs index.
 *
 * The spec is an early W3C CG draft that has already moved once (from
 * `navigator.modelContext` to `document.modelContext`), so everything is
 * feature-detected and typed locally; when the API is absent this module does
 * nothing. Chrome additionally requires an origin-trial token (trial 149-156),
 * served as the commented Origin-Trial header placeholder in next.config.ts.
 */

type WebMcpToolResult = {
  content: { type: string; text?: string }[];
  isError?: boolean;
};

type WebMcpToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<WebMcpToolResult>;
};

export type WebMcpModelContext = {
  registerTool: (
    tool: WebMcpToolDescriptor,
  ) => { unregister?: () => void } | undefined | void;
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

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

async function callMcpRoute(
  fetchImpl: FetchLike,
  toolName: string,
  args: Record<string, unknown>,
): Promise<WebMcpToolResult> {
  let response;
  try {
    response = await fetchImpl("/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
    });
  } catch (error) {
    return errorResult(
      `Docs request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    return errorResult(`Docs request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    result?: WebMcpToolResult;
    error?: { message?: string };
  };
  if (payload.error) {
    return errorResult(payload.error.message ?? "Docs request failed");
  }
  if (!payload.result?.content) {
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
  while (normalized.startsWith("/")) normalized = normalized.slice(1);
  return normalized === "examples" || normalized.startsWith("examples/")
    ? normalized
    : `examples/${normalized}`;
}

export function createWebMcpTools(
  fetchImpl: FetchLike,
): WebMcpToolDescriptor[] {
  return [
    {
      name: "searchDocs",
      description:
        "Search the assistant-ui documentation, examples, and Tap docs by title, description, or URL. Returns up to 20 matching pages.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
        },
        required: ["query"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const query = stringArg(args, "query");
        if (!query) return errorResult("query is required");
        return callMcpRoute(fetchImpl, "search_docs", { query });
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
      execute: async (args) => {
        const path = stringArg(args, "path");
        if (!path) return errorResult("path is required");
        return callMcpRoute(fetchImpl, "read_page", { path });
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
      execute: async (args) => {
        const path = stringArg(args, "path");
        if (!path) return errorResult("path is required");
        return callMcpRoute(fetchImpl, "read_page", {
          path: examplePath(path),
        });
      },
    },
  ];
}

export function registerWebMcpTools(
  modelContext: WebMcpModelContext,
  fetchImpl: FetchLike,
): () => void {
  const registrations = createWebMcpTools(fetchImpl).map((tool) =>
    modelContext.registerTool(tool),
  );
  return () => {
    for (const registration of registrations) {
      registration?.unregister?.();
    }
  };
}
