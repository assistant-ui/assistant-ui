import type * as PageTree from "fumadocs-core/page-tree";
import { NextResponse, type NextRequest } from "next/server";
import { getLLMText } from "@/lib/get-llm-text";
import { examples, getTapDocsPage, source, tapDocs } from "@/lib/source";

export const revalidate = false;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

const PROTOCOL_VERSION = "2025-06-18";

const toolDefinitions = [
  {
    name: "list_pages",
    description:
      "List assistant-ui documentation pages. Optionally filter by a URL path prefix such as /docs/tools, /examples, or /tap/docs.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional docs path or prefix to filter by.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_navigation",
    description: "Return the assistant-ui docs navigation tree.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "search_docs",
    description:
      "Search assistant-ui docs, examples, and Tap docs by title, description, or URL.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "read_page",
    description:
      "Read one assistant-ui docs, examples, or Tap docs page as markdown. Accepts a slug, path, .md URL, or same-origin URL.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Page path such as /docs/installation, /docs/installation.md, examples/ai-sdk, tap/docs/store/state, or a same-origin URL.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
];

function getStringParam(params: unknown, key: string) {
  if (params && typeof params === "object" && key in params) {
    const value = (params as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function pageSummary(page: {
  url: string;
  data: { title: string; description?: string | undefined };
}) {
  return {
    title: page.data.title,
    url: page.url,
    ...(page.data.description ? { description: page.data.description } : {}),
  };
}

function allPages() {
  return [
    ...source.getPages().map((page) => ({ kind: "docs" as const, page })),
    ...examples.getPages().map((page) => ({
      kind: "examples" as const,
      page,
    })),
    ...tapDocs.getPages().map((page) => ({
      kind: "tap" as const,
      page,
    })),
  ];
}

function hasHttpScheme(value: string) {
  const prefix = value.slice(0, "https://".length).toLowerCase();
  return prefix.startsWith("http://") || prefix.startsWith("https://");
}

function stripLeadingSlashes(value: string) {
  let start = 0;
  while (start < value.length && value.charCodeAt(start) === 47) start += 1;
  return value.slice(start);
}

function stripTrailingSlashes(value: string) {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1;
  return value.slice(0, end);
}

function stripMarkdownSuffix(value: string) {
  const lower = value.toLowerCase();
  if (lower.endsWith("/index.mdx")) return value.slice(0, -"/index.mdx".length);
  if (lower.endsWith("/index.md")) return value.slice(0, -"/index.md".length);
  if (lower.endsWith(".mdx")) return value.slice(0, -".mdx".length);
  if (lower.endsWith(".md")) return value.slice(0, -".md".length);
  return value;
}

function normalizePathname(rawPath: string, requestUrl?: string) {
  let value = rawPath.trim();

  if (hasHttpScheme(value)) {
    const parsed = new URL(value);
    if (requestUrl) {
      const request = new URL(requestUrl);
      if (parsed.origin !== request.origin) {
        throw new Error("Only same-origin docs URLs are supported");
      }
    }
    value = parsed.pathname;
  }

  return stripMarkdownSuffix(stripTrailingSlashes(stripLeadingSlashes(value)));
}

function normalizePageUrlPrefix(rawPath: string) {
  const pathname = normalizePathname(rawPath);
  return pathname ? `/${pathname}` : "";
}

function normalizePath(rawPath: string, requestUrl: string) {
  const value = normalizePathname(rawPath, requestUrl);
  if (!value) return { kind: "docs" as const, slugs: [] };

  if (value.includes("..")) {
    throw new Error("Parent directory segments are not supported");
  }

  if (value === "docs") return { kind: "docs" as const, slugs: [] };
  if (value === "examples") return { kind: "examples" as const, slugs: [] };
  if (value === "tap/docs") return { kind: "tap" as const, slugs: [] };
  if (value.startsWith("docs/")) {
    return {
      kind: "docs" as const,
      slugs: value.slice("docs/".length).split("/").filter(Boolean),
    };
  }
  if (value.startsWith("examples/")) {
    return {
      kind: "examples" as const,
      slugs: value.slice("examples/".length).split("/").filter(Boolean),
    };
  }
  if (value.startsWith("tap/docs/")) {
    return {
      kind: "tap" as const,
      slugs: value.slice("tap/docs/".length).split("/").filter(Boolean),
    };
  }
  return { kind: "docs" as const, slugs: value.split("/").filter(Boolean) };
}

function listPages(path: string | undefined) {
  const normalizedPrefix = path ? normalizePageUrlPrefix(path) : undefined;

  return allPages()
    .map(({ page }) => pageSummary(page))
    .filter(
      (page) =>
        !normalizedPrefix ||
        page.url === normalizedPrefix ||
        page.url.startsWith(`${normalizedPrefix}/`),
    );
}

function serializeNode(node: PageTree.Node): unknown {
  if (node.type === "page") {
    return {
      type: "page",
      title: typeof node.name === "string" ? node.name : node.url,
      url: node.url,
      ...("description" in node &&
      typeof node.description === "string" &&
      node.description
        ? { description: node.description }
        : {}),
    };
  }

  if (node.type === "folder") {
    return {
      type: "folder",
      title: typeof node.name === "string" ? node.name : undefined,
      ...(node.index ? { url: node.index.url } : {}),
      ...("description" in node &&
      typeof node.description === "string" &&
      node.description
        ? { description: node.description }
        : {}),
      children: node.children.map(serializeNode),
    };
  }

  return {
    type: node.type,
  };
}

function getNavigation() {
  return {
    docs: source.pageTree.children.map(serializeNode),
    examples: examples.pageTree.children.map(serializeNode),
    tapDocs: tapDocs.pageTree.children.map(serializeNode),
  };
}

function searchDocs(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return allPages()
    .map(({ page }) => pageSummary(page))
    .filter((page) =>
      [page.title, page.url, page.description ?? ""].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    )
    .slice(0, 20);
}

async function readPage(path: string | undefined, requestUrl: string) {
  if (!path) throw new Error("path is required");

  const normalized = normalizePath(path, requestUrl);
  const page =
    normalized.kind === "examples"
      ? examples.getPage(normalized.slugs)
      : normalized.kind === "tap"
        ? getTapDocsPage(normalized.slugs)
        : source.getPage(normalized.slugs);

  if (!page) throw new Error(`Page not found: ${path}`);

  return {
    title: page.data.title,
    url: page.url,
    content: await getLLMText(page),
  };
}

async function callTool(
  name: string | undefined,
  params: unknown,
  requestUrl: string,
) {
  const args =
    params && typeof params === "object" && "arguments" in params
      ? (params as { arguments?: unknown }).arguments
      : undefined;

  switch (name) {
    case "list_pages":
      return listPages(getStringParam(args, "path"));
    case "get_navigation":
      return getNavigation();
    case "search_docs":
      return searchDocs(getStringParam(args, "query") ?? "");
    case "read_page":
      return readPage(getStringParam(args, "path"), requestUrl);
    default:
      throw new Error(`Unknown tool: ${name ?? "missing"}`);
  }
}

function jsonRpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleJsonRpcMessage(
  message: JsonRpcRequest,
  requestUrl: string,
) {
  if (message.id === undefined) return null;

  try {
    switch (message.method) {
      case "initialize": {
        return jsonRpcResult(message.id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
          serverInfo: {
            name: "assistant-ui-docs",
            version: "1.0.0",
          },
        });
      }
      case "tools/list":
        return jsonRpcResult(message.id, { tools: toolDefinitions });
      case "tools/call": {
        const name = getStringParam(message.params, "name");
        const result = await callTool(name, message.params, requestUrl);
        return jsonRpcResult(message.id, {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        });
      }
      case "resources/list":
        return jsonRpcResult(message.id, {
          resources: [
            {
              uri: "assistant-ui://navigation",
              name: "assistant-ui docs navigation",
              mimeType: "application/json",
            },
            ...allPages().map(({ page }) => ({
              uri: `assistant-ui://${stripLeadingSlashes(page.url)}`,
              name: page.data.title,
              mimeType: "text/markdown",
            })),
          ],
        });
      case "resources/read": {
        const uri = getStringParam(message.params, "uri");
        if (uri === "assistant-ui://navigation") {
          return jsonRpcResult(message.id, {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(getNavigation(), null, 2),
              },
            ],
          });
        }
        if (!uri?.startsWith("assistant-ui://")) {
          return jsonRpcError(message.id, -32602, "Unsupported resource URI");
        }
        const path = uri.slice("assistant-ui://".length);
        const page = await readPage(path, requestUrl);
        return jsonRpcResult(message.id, {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: page.content,
            },
          ],
        });
      }
      default:
        return jsonRpcError(
          message.id,
          -32601,
          `Method not found: ${message.method ?? "missing"}`,
        );
    }
  } catch (error) {
    return jsonRpcError(
      message.id,
      -32000,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

export async function GET() {
  return jsonResponse({
    name: "assistant-ui-docs",
    protocol: "mcp",
    endpoints: ["/mcp", "/.well-known/mcp", "/docs/mcp"],
    tools: toolDefinitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
  });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(jsonRpcError(null, -32700, "Parse error"), {
      status: 400,
    });
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return jsonResponse(jsonRpcError(null, -32600, "Invalid Request"), {
        status: 400,
      });
    }

    const results = (
      await Promise.all(
        payload.map((message) =>
          handleJsonRpcMessage(message as JsonRpcRequest, request.url),
        ),
      )
    ).filter((result) => result !== null);

    return results.length > 0
      ? jsonResponse(results)
      : new NextResponse(null, { status: 202 });
  }

  const result = await handleJsonRpcMessage(
    payload as JsonRpcRequest,
    request.url,
  );

  return result
    ? jsonResponse(result)
    : new NextResponse(null, { status: 202 });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}
