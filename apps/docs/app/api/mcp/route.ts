import type * as PageTree from "fumadocs-core/page-tree";
import { NextResponse, type NextRequest } from "next/server";
import {
  McpServer,
  ResourceTemplate,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { getLLMText } from "@/lib/get-llm-text";
import {
  checkMcpDocsToolRateLimit,
  checkMcpTemplateToolRateLimit,
} from "@/lib/rate-limit";
import {
  SEARCH_DOCS_RESULT_LIMIT,
  docsToolDefinitions,
  getNavigationTool,
  listPagesTool,
  readPageTool,
  searchDocsTool,
} from "@/lib/mcp-tool-definitions";
import {
  examples,
  getTapDocsPage,
  getTapDocsPages,
  source,
  design,
  elementsDocs,
  tapDocs,
} from "@/lib/source";
import { buildXuluxMcpCatalog } from "@/lib/xulux/mcp-catalog";
import {
  createTemplatePreview,
  getTemplateDetails,
  listTemplates,
} from "@/lib/xulux/template-service";
import { normalizeMcpRequestHeaders } from "./normalize-mcp-headers";

export const revalidate = false;
// One sandbox call bounds the template tools at 30s and the rest is in-process
// rendering, so this sits well under the platform default and an overrun
// surfaces here rather than at the CDN in front of it.
export const maxDuration = 120;

const templateToolDefinitions = [
  {
    name: "list_templates",
    description:
      "List the hosted assistant-ui app templates and fixed demos with their features, customizable surfaces, and versions. Call this first for any assistant-ui app-building request. If customizable is empty, the entry is a fixed demo that should be used as-is rather than configured. Call read_template on the chosen template before requesting a preview.",
  },
  {
    name: "read_template",
    description:
      "Get the full authoring surface for one hosted assistant-ui template: configRoots schemas (types, defaults, enums), rules, built-in tool contracts, and an exampleConfig. Fixed demos return no configRoots; use those as-is. Use this before preview_template to understand exactly what config to write. If preview_template returns validationWarnings, cross-reference configRoots here to correct the config.",
  },
  {
    name: "preview_template",
    description:
      "Return preview and download URLs for a hosted assistant-ui template. Passing config creates a preview session on the template sandbox and the returned URLs reflect that configuration. Do not pass config for fixed demos that have no configRoots in read_template. Show the previewUrl to the user or open it with an available browser tool if your client provides one.",
  },
] as const;

const [listTemplatesTool, readTemplateTool, previewTemplateTool] =
  templateToolDefinitions;

const toolDefinitions = [
  ...docsToolDefinitions,
  ...templateToolDefinitions,
] as const;

const templateWorkflowPrompt = {
  name: "assistant-ui-template-workflow",
  description:
    "How to use the assistant-ui template tools to discover hosted templates, inspect their customization contracts, and retrieve preview/download URLs.",
  text: `You have access to assistant-ui template tools for hosted app templates.

<workflow>
Follow this template-first workflow for any assistant-ui app-building request:

1. Call **list_templates** FIRST. Never decide on a template or claim one exists without listing.
2. Call **read_template** on any candidate template before deciding whether it fits.
   - Review the whole template shape: features, assistantPlacement, configRoots schemas, rules, built-in tools, renderers, and exampleConfig.
   - If \`customizable\` is empty, the entry is a fixed demo. Use it as-is; never pass a config for it.
3. Decide one of three paths:
   - The template fits as-is: call **preview_template** with templateId and optional versionId.
   - The template fits with supported customization: author a config using the configRoots schemas and rules from read_template, then call **preview_template** with that config.
   - No template fits: do NOT call preview_template. Do not force the request into a template or fake domain content with mock config. Instead, ground yourself in the assistant-ui docs (list_pages, search_docs, read_page) and produce an honest, docs-grounded build guide or prompt for the user.
</workflow>

<important_constraints>
- Only use URLs copied exactly from tool results. Never guess, fabricate, or use placeholder URLs.
- If preview_template returns validationWarnings or an error, call read_template again and correct the config against configRoots. Pass only the documented top-level config roots.
- Customization is for supported adaptation within a template's shape, not for turning it into a completely different kind of product.
</important_constraints>`,
} as const;

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
    ...design.getPages().map((page) => ({
      kind: "design" as const,
      page,
    })),
    ...elementsDocs.getPages().map((page) => ({
      kind: "elements" as const,
      page,
    })),
    ...getTapDocsPages().map((page) => ({
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
  if (value === "design") return { kind: "design" as const, slugs: [] };
  if (value === "elements") return { kind: "elements" as const, slugs: [] };
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
  if (value.startsWith("design/")) {
    return {
      kind: "design" as const,
      slugs: value.slice("design/".length).split("/").filter(Boolean),
    };
  }
  if (value.startsWith("elements/")) {
    return {
      kind: "elements" as const,
      slugs: value.slice("elements/".length).split("/").filter(Boolean),
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
    design: design.pageTree.children.map(serializeNode),
    elements: elementsDocs.pageTree.children.map(serializeNode),
    tapDocs: tapDocs.pageTree.children.map(serializeNode),
  };
}

async function searchDocs(query: string) {
  const [{ buildContentIndex }, { searchContent }] = await Promise.all([
    import("@/lib/search/content-index"),
    import("@/lib/search/content-search"),
  ]);

  return searchContent(
    await buildContentIndex(),
    query,
    SEARCH_DOCS_RESULT_LIMIT,
  ).map((page) => ({
    title: page.title,
    url: page.url,
    ...(page.description ? { description: page.description } : {}),
    ...(page.headings.length > 0 ? { headings: page.headings } : {}),
    ...(page.excerpt ? { excerpt: page.excerpt } : {}),
  }));
}

async function readPage(path: string | undefined, requestUrl: string) {
  if (!path) throw new Error("path is required");

  const normalized = normalizePath(path, requestUrl);
  const page =
    normalized.kind === "examples"
      ? examples.getPage(normalized.slugs)
      : normalized.kind === "design"
        ? design.getPage(normalized.slugs)
        : normalized.kind === "elements"
          ? elementsDocs.getPage(normalized.slugs)
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
    query: z
      .string()
      .describe(searchDocsTool.inputSchema.properties.query.description),
  })
  .strict();

const readPageInputSchema = z
  .object({
    path: z
      .string()
      .describe(readPageTool.inputSchema.properties.path.description),
  })
  .strict();

const listTemplatesInputSchema = z.object({}).strict();

const readTemplateInputSchema = z
  .object({
    templateId: z.string().describe("The template id from list_templates"),
    versionId: z
      .string()
      .optional()
      .describe(
        "Optional version id. When provided, exampleConfig reflects that version's resolved defaults.",
      ),
  })
  .strict();

const previewTemplateInputSchema = z
  .object({
    templateId: z.string().describe("The template id from list_templates"),
    versionId: z
      .string()
      .optional()
      .describe("Version id to use. Uses the template default if omitted."),
    config: z
      .object({
        hostUi: z.unknown().optional(),
        assistant: z.unknown().optional(),
        brandTheme: z.unknown().optional(),
      })
      .strict()
      .optional()
      .describe(
        "Customization config for the preview. Must contain only the top-level keys: hostUi, assistant, and brandTheme. " +
          "Use the schemas from read_template.configRoots as the source of truth for each root. " +
          "Do not pass any other root keys.",
      ),
  })
  .strict();

function templateVarToPath(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join("/") : (value ?? "");
}

function registerResources(server: McpServer, request: NextRequest) {
  const requestUrl = request.url;

  server.registerResource(
    "assistant-ui docs navigation",
    "assistant-ui://navigation",
    { mimeType: "application/json" },
    async (uri) => {
      await requireDocsToolBudget(request);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(getNavigation(), null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "assistant-ui docs pages",
    new ResourceTemplate("assistant-ui://{+path}", {
      list: async () => {
        await requireDocsToolBudget(request);
        return {
          resources: allPages().map(({ page }) => ({
            uri: `assistant-ui://${stripLeadingSlashes(page.url)}`,
            name: page.data.title,
            mimeType: "text/markdown",
          })),
        };
      },
    }),
    { mimeType: "text/markdown" },
    async (uri, variables) => {
      await requireDocsToolBudget(request);
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

async function throttleMessage(denial: Response, suffix: string) {
  const retryAfter = denial.headers.get("Retry-After");
  return (
    `${await denial.text()}.` +
    (retryAfter ? ` Retry in ${retryAfter}s.` : "") +
    suffix
  );
}

async function requireTemplateToolBudget(request: NextRequest) {
  const denial = await checkMcpTemplateToolRateLimit(request);
  if (!denial) return;

  const suffix = " The assistant-ui docs tools remain available.";
  if (denial.status !== 429) {
    throw new Error(`Template tools are temporarily unavailable.${suffix}`);
  }
  throw new Error(await throttleMessage(denial, suffix));
}

async function requireDocsToolBudget(request: NextRequest) {
  const denial = await checkMcpDocsToolRateLimit(request);
  // These tools cost one in-process render and nothing external, so a
  // rate-limit store outage serves them unmetered rather than taking the
  // surface down with it. Only an exhausted budget refuses.
  if (denial?.status !== 429) return;
  throw new Error(await throttleMessage(denial, ""));
}

function buildMcpServer(request: NextRequest) {
  const server = new McpServer({
    name: "assistant-ui-docs",
    version: "1.0.0",
  });
  const requestUrl = request.url;
  const requestOrigin = new URL(requestUrl).origin;

  server.registerTool(
    listPagesTool.name,
    {
      description: listPagesTool.description,
      inputSchema: listPagesInputSchema,
    },
    ({ path }) =>
      toolResult(async () => {
        await requireDocsToolBudget(request);
        return listPages(path);
      }),
  );

  server.registerTool(
    getNavigationTool.name,
    {
      description: getNavigationTool.description,
      inputSchema: getNavigationInputSchema,
    },
    () =>
      toolResult(async () => {
        await requireDocsToolBudget(request);
        return getNavigation();
      }),
  );

  server.registerTool(
    searchDocsTool.name,
    {
      description: searchDocsTool.description,
      inputSchema: searchDocsInputSchema,
    },
    ({ query }) =>
      toolResult(async () => {
        await requireDocsToolBudget(request);
        return searchDocs(query);
      }),
  );

  server.registerTool(
    readPageTool.name,
    {
      description: readPageTool.description,
      inputSchema: readPageInputSchema,
    },
    ({ path }) =>
      toolResult(async () => {
        await requireDocsToolBudget(request);
        return readPage(path, requestUrl);
      }),
  );

  server.registerTool(
    listTemplatesTool.name,
    {
      description: listTemplatesTool.description,
      inputSchema: listTemplatesInputSchema,
    },
    () =>
      toolResult(async () => {
        await requireDocsToolBudget(request);
        return listTemplates(buildXuluxMcpCatalog(requestOrigin));
      }),
  );

  server.registerTool(
    readTemplateTool.name,
    {
      description: readTemplateTool.description,
      inputSchema: readTemplateInputSchema,
    },
    (input) =>
      toolResult(async () => {
        await requireTemplateToolBudget(request);
        return getTemplateDetails(buildXuluxMcpCatalog(requestOrigin), input);
      }),
  );

  server.registerTool(
    previewTemplateTool.name,
    {
      description: previewTemplateTool.description,
      inputSchema: previewTemplateInputSchema,
    },
    (input) =>
      toolResult(async () => {
        await requireTemplateToolBudget(request);
        return createTemplatePreview(
          buildXuluxMcpCatalog(requestOrigin),
          input,
        );
      }),
  );

  server.registerPrompt(
    templateWorkflowPrompt.name,
    { description: templateWorkflowPrompt.description },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: templateWorkflowPrompt.text },
        },
      ],
    }),
  );

  registerResources(server, request);

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

function acceptsEventStream(request: NextRequest) {
  return (request.headers.get("accept") ?? "")
    .toLowerCase()
    .split(",")
    .some((range) => range.split(";")[0]?.trim() === "text/event-stream");
}

export async function GET(request: NextRequest) {
  // `Accept: text/event-stream` opens the Streamable HTTP server-to-client
  // stream, which this stateless endpoint does not offer; a 200 reads as a
  // stream that opened and closed, and clients answer that by reconnecting.
  if (acceptsEventStream(request)) {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      },
      { status: 405, headers: { Allow: "POST, OPTIONS" } },
    );
  }

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
  const server = buildMcpServer(request);
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
