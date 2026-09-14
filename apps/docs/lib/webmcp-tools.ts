// The local API types follow webmachinelearning/webmcp@41d12f057167ccf5954dbcf49d99502cb6c84491
// and were exercised in Chrome 151. The draft has already moved attachment
// points, so the API is feature-detected rather than added to global types.

import {
  SEARCH_DOCS_RESULT_LIMIT,
  readPageTool,
  searchDocsTool,
} from "@/lib/mcp-tool-definitions";
import {
  AGENT_DISCOVERY_ROUTES,
  agentSkillPath,
} from "./agent-discovery-routes";
import { analytics } from "./analytics";

type WebMcpToolResult = {
  content: { type: string; text?: string }[];
  isError?: boolean;
};

export type WebMcpToolName =
  | "searchDocs"
  | "getDoc"
  | "getExample"
  | "listSkills"
  | "getSkill";

type WebMcpToolDescriptor = {
  name: WebMcpToolName;
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
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

// Cancellation must reach the caller untouched so an abort it requested stays
// distinguishable from a transport or parse failure.
function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

async function fetchRoute(
  fetchImpl: FetchLike,
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
  signal?: AbortSignal,
) {
  try {
    return await fetchImpl(url, { ...init, ...(signal ? { signal } : {}) });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new Error(
      `Docs request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function readJson(response: Awaited<ReturnType<FetchLike>>) {
  try {
    return await response.json();
  } catch (error) {
    // fetch resolves once headers arrive, so an abort while the body is still
    // streaming surfaces here rather than at the request above.
    if (isAbortError(error)) throw error;
    throw new Error("Docs request returned invalid JSON");
  }
}

function statusError(status: number) {
  return new Error(`Docs request failed with status ${status}`);
}

async function callMcpRoute(
  fetchImpl: FetchLike,
  toolName: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<WebMcpToolResult> {
  const response = await fetchRoute(
    fetchImpl,
    "/api/mcp",
    {
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
    },
    signal,
  );
  if (!response.ok) throw statusError(response.status);

  const payload = (await readJson(response)) as {
    result?: WebMcpToolResult;
    error?: { message?: string };
  } | null;
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

type WebMcpTracker = typeof analytics.webmcp;

function trackSafely(label: string, track: () => void) {
  const warn = (error: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`WebMCP: failed to track ${label}`, error);
    }
  };
  try {
    Promise.resolve(track()).catch(warn);
  } catch (error) {
    warn(error);
  }
}

const withCallCounter =
  (
    tool: WebMcpToolDescriptor["name"],
    execute: WebMcpToolDescriptor["execute"],
    tracker: WebMcpTracker,
  ): WebMcpToolDescriptor["execute"] =>
  async (args, context) => {
    const start = performance.now();
    const report = (status: "ok" | "error" | "aborted") =>
      trackSafely(tool, () =>
        tracker.toolCalled({
          tool,
          status,
          latency_ms: Math.round(performance.now() - start),
        }),
      );
    try {
      const result = await execute(args, context);
      report(result.isError ? "error" : "ok");
      return result;
    } catch (error) {
      report(isAbortError(error) ? "aborted" : "error");
      throw error;
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

function jsonResult(value: unknown): WebMcpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}

// The repo skills are served by the Agent Skills discovery routes, so the
// tools read those instead of bundling the ~200 KB snapshot into the page.
type SkillIndexEntry = { name: string; description: string; url: string };

async function listSkillsFromIndex(fetchImpl: FetchLike, signal?: AbortSignal) {
  const response = await fetchRoute(
    fetchImpl,
    AGENT_DISCOVERY_ROUTES.skillsIndex,
    { method: "GET", headers: { Accept: "application/json" } },
    signal,
  );
  if (!response.ok) throw statusError(response.status);
  const index = (await readJson(response)) as { skills?: unknown } | null;
  if (!Array.isArray(index?.skills)) {
    throw new Error("Docs request returned an unexpected response");
  }
  // The index also lists the site's own skills; the repo skills are the
  // entries served at the per-skill route.
  return (index.skills as SkillIndexEntry[])
    .filter(
      ({ name, url }) =>
        url.endsWith(agentSkillPath(name)) &&
        !url.endsWith(AGENT_DISCOVERY_ROUTES.siteSkill),
    )
    .map(({ name, description }) => ({ name, description }));
}

// Inverse of agentSkillDocument: the route serves a two-key frontmatter with
// a JSON-quoted description.
function parseSkillDocument(document: string) {
  const match = /^---\nname: (.+)\ndescription: (.+)\n---\n\n([\s\S]*)$/.exec(
    document,
  );
  if (!match) throw new Error("Docs request returned an unexpected response");
  const [, name = "", description = "", content = ""] = match;
  return { name, description: JSON.parse(description) as string, content };
}

async function readSkillFromRoute(
  fetchImpl: FetchLike,
  name: string,
  signal?: AbortSignal,
) {
  const response = await fetchRoute(
    fetchImpl,
    agentSkillPath(encodeURIComponent(name)),
    { method: "GET", headers: { Accept: "text/markdown" } },
    signal,
  );
  if (response.status === 404) {
    const names = await listSkillsFromIndex(fetchImpl, signal);
    throw new Error(
      `Unknown skill: ${name}. Valid names: ${names.map((s) => s.name).join(", ")}`,
    );
  }
  if (!response.ok) throw statusError(response.status);
  return parseSkillDocument(await response.text());
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
        "Read one assistant-ui docs page as markdown. Accepts a path such as /docs/installation or docs/store/state.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Docs page path such as /docs/installation or docs/store/state, or a same-origin URL for one of those pages.",
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
    {
      name: "listSkills",
      description:
        "List the assistant-ui agent skills: task-shaped guides (setup, tools, runtime, streaming, ...) for building with assistant-ui. Returns every skill's name and description; read one with getSkill.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (_args, context) =>
        jsonResult(await listSkillsFromIndex(fetchImpl, context?.signal)),
    },
    {
      name: "getSkill",
      description:
        "Read one assistant-ui agent skill by name, such as tools or setup. Returns its name, description, and full markdown content.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Skill name as returned by listSkills, such as tools.",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args, context) => {
        const name = stringArg(args, "name");
        if (!name) throw new Error("name is required");
        return jsonResult(
          await readSkillFromRoute(fetchImpl, name, context?.signal),
        );
      },
    },
  ];
}

export function registerWebMcpTools(
  modelContext: WebMcpModelContext,
  fetchImpl: FetchLike,
  tracker: WebMcpTracker = analytics.webmcp,
): () => void {
  trackSafely("host detection", () => tracker.hostDetected());
  const controller = new AbortController();
  for (const tool of webMcpTools(fetchImpl)) {
    Promise.resolve(
      modelContext.registerTool(
        {
          ...tool,
          execute: withCallCounter(
            tool.name,
            withErrorResults(tool.execute),
            tracker,
          ),
        },
        { signal: controller.signal },
      ),
    ).then(
      () =>
        trackSafely(`${tool.name} registration`, () =>
          tracker.toolRegistered({ tool: tool.name, status: "ok" }),
        ),
      (error) => {
        trackSafely(`${tool.name} registration`, () =>
          tracker.toolRegistered({
            tool: tool.name,
            status: "failed",
            error_name: error instanceof Error ? error.name : typeof error,
          }),
        );
        // Registration failures (permissions policy, duplicate names, spec
        // drift) must not break the page, but should be visible in development.
        if (process.env.NODE_ENV !== "production") {
          console.warn(`WebMCP: failed to register ${tool.name}`, error);
        }
      },
    );
  }
  return () => {
    controller.abort();
  };
}
