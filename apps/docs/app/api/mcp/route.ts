import type * as PageTree from "fumadocs-core/page-tree";
import { NextResponse, type NextRequest } from "next/server";
import {
  McpServer,
  ResourceTemplate,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { getLLMText } from "@/lib/get-llm-text";
import { examples, getTapDocsPage, source, tapDocs } from "@/lib/source";
import { normalizeMcpRequestHeaders } from "./normalize-mcp-headers";

export const revalidate = false;

const toolDefinitions = [
  {
    name: "list_pages",
    description:
      "List assistant-ui documentation pages. Optionally filter by a URL path prefix such as /docs/tools, /examples, or /tap/docs.",
  },
  {
    name: "get_navigation",
    description: "Return the assistant-ui docs navigation tree.",
  },
  {
    name: "search_docs",
    description:
      "Search assistant-ui docs, examples, and Tap docs by title, description, or URL.",
  },
  {
    name: "read_page",
    description:
      "Read one assistant-ui docs, examples, or Tap docs page as markdown. Accepts a slug, path, .md URL, or same-origin URL.",
  },
] as const;

const [listPagesTool, getNavigationTool, searchDocsTool, readPageTool] =
  toolDefinitions;

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

function toolTextResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function stringifyToolResult(result: unknown) {
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

async function toolResult(fn: () => unknown | Promise<unknown>) {
  try {
    return toolTextResult(stringifyToolResult(await fn()));
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true as const,
    };
  }
}

const listPagesInputSchema = z
  .object({
    path: z
      .string()
      .describe("Optional docs path or prefix to filter by.")
      .optional(),
  })
  .strict();

const getNavigationInputSchema = z.object({}).strict();

const searchDocsInputSchema = z
  .object({
    query: z.string().describe("Search query."),
  })
  .strict();

const readPageInputSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Page path such as /docs/installation, /docs/installation.md, examples/ai-sdk, tap/docs/store/state, or a same-origin URL.",
      ),
  })
  .strict();

function templateVarToPath(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join("/") : (value ?? "");
}

function registerResources(server: McpServer, requestUrl: string) {
  server.registerResource(
    "assistant-ui docs navigation",
    "assistant-ui://navigation",
    { mimeType: "application/json" },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(getNavigation(), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "assistant-ui docs pages",
    new ResourceTemplate("assistant-ui://{+path}", {
      list: async () => ({
        resources: allPages().map(({ page }) => ({
          uri: `assistant-ui://${stripLeadingSlashes(page.url)}`,
          name: page.data.title,
          mimeType: "text/markdown",
        })),
      }),
    }),
    { mimeType: "text/markdown" },
    async (uri, variables) => {
      const path = templateVarToPath(variables["path"]);
      const page = await readPage(path, requestUrl);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: page.content,
          },
        ],
      };
    },
  );
}

function buildMcpServer(requestUrl: string) {
  const server = new McpServer({
    name: "assistant-ui-docs",
    version: "1.0.0",
  });

  server.registerTool(
    listPagesTool.name,
    {
      description: listPagesTool.description,
      inputSchema: listPagesInputSchema,
    },
    ({ path }) => toolResult(() => listPages(path)),
  );

  server.registerTool(
    getNavigationTool.name,
    {
      description: getNavigationTool.description,
      inputSchema: getNavigationInputSchema,
    },
    () => toolResult(() => getNavigation()),
  );

  server.registerTool(
    searchDocsTool.name,
    {
      description: searchDocsTool.description,
      inputSchema: searchDocsInputSchema,
    },
    ({ query }) => toolResult(() => searchDocs(query)),
  );

  server.registerTool(
    readPageTool.name,
    {
      description: readPageTool.description,
      inputSchema: readPageInputSchema,
    },
    ({ path }) => toolResult(() => readPage(path, requestUrl)),
  );

  registerResources(server, requestUrl);

  return server;
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
  const server = buildMcpServer(request.url);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    const normalizedRequest = await normalizeMcpRequestHeaders(request);
    return await transport.handleRequest(normalizedRequest);
  } finally {
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  }
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
