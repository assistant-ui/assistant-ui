import { cacheLife } from "next/cache";
import type * as PageTree from "fumadocs-core/page-tree";
import { NextResponse, type NextRequest } from "next/server";
import {
  CLIENT_INFO_META_KEY,
  DEFAULT_MAX_REQUEST_BODY_SIZE,
  McpServer,
  PROTOCOL_VERSION_META_KEY,
  ResourceTemplate,
  WebStandardStreamableHTTPServerTransport,
  createMcpHandler,
  isLegacyRequest,
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
import { examples, source, design, elementsDocs, siteTree } from "@/lib/source";
import { rewriteLegacyTapDocsPath } from "@/lib/legacy-tap-docs";
import { rewriteMovedDocsPath } from "@/lib/moved-docs";
import {
  DOCS_SITES,
  docsSiteBaseUrl,
  rewriteLegacyDocsSitePath,
} from "@/lib/docs-sites";
import { allDocsPages, resolveDocsUrl } from "@/lib/docs-pages";
import { buildXuluxMcpCatalog } from "@/lib/xulux/mcp-catalog";
import {
  createTemplatePreview,
  getTemplateDetails,
  listTemplates,
} from "@/lib/xulux/template-service";
import {
  agentClientFamily,
  agentPath,
  agentText,
  captureAgentEvent,
  type AgentEventProperties,
} from "@/lib/agent-telemetry";
import { docsOverviewPage } from "@/lib/docs-fallback";
import { kebabCaseSlug, nearestPages } from "@/lib/docs-markdown";
import {
  elementGalleryMarkdown,
  vocabularyMarkdown,
} from "@/lib/elements-markdown";
import { getElement } from "@/components/pages/elements/registry";
import { normalizeMcpRequestHeaders } from "./normalize-mcp-headers";

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

const serverInstructions = `assistant-ui docs server: read the assistant-ui documentation (docs, examples, design components, elements, Tap and the other assistant-ui project sites) and preview hosted assistant-ui app templates.

Docs tools:
- search_docs: find pages for a topic or API name. Start here for most questions.
- read_page: read one page as markdown by the url from search_docs, list_pages or get_navigation.
- list_pages: list page titles and urls, optionally under a prefix such as /docs/tools.
- get_navigation: the sidebar tree for every docs section.
The same pages are resources: assistant-ui://navigation and assistant-ui://{path}.

Template tools, for building an assistant-ui app:
- list_templates: every hosted template and fixed demo. An empty customizable list means a fixed demo.
- read_template: one template's configRoots schemas, rules, built-in tools and exampleConfig.
- preview_template: preview and download URLs, optionally for a custom config.

Typical flows:
- Docs question: search_docs, then read_page on the best results.
- App request: list_templates, read_template on a candidate, then preview_template with no config or with a config written against configRoots. If no template fits, skip preview_template and answer from the docs.
Only share URLs copied from tool results. The ${templateWorkflowPrompt.name} prompt has the full template workflow.`;

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
    ...allDocsPages().map((page) => ({ kind: "docs" as const, page })),
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

function rewriteLegacyPath(pathname: string) {
  return (
    rewriteLegacyTapDocsPath(pathname) ??
    rewriteLegacyDocsSitePath(pathname) ??
    rewriteMovedDocsPath(pathname)
  );
}

function normalizePageUrlPrefix(rawPath: string) {
  const pathname = normalizePathname(rawPath);
  return rewriteLegacyPath(pathname) ?? (pathname ? `/${pathname}` : "");
}

function isDocsSitePath(value: string) {
  return DOCS_SITES.some((site) => {
    const base = docsSiteBaseUrl(site.id).slice(1);
    return value === base || value.startsWith(`${base}/`);
  });
}

function normalizePath(rawPath: string, requestUrl: string) {
  const normalizedPath = normalizePathname(rawPath, requestUrl);
  const legacyPath = rewriteLegacyPath(normalizedPath);
  const value = legacyPath ? legacyPath.slice(1) : normalizedPath;
  if (!value) return { kind: "docs" as const, slugs: [] };

  if (value.includes("..")) {
    throw new Error("Parent directory segments are not supported");
  }

  if (isDocsSitePath(value)) {
    return { kind: "site" as const, pathname: `/${value}` };
  }

  if (value === "docs") return { kind: "docs" as const, slugs: [] };
  if (value === "examples") return { kind: "examples" as const, slugs: [] };
  if (value === "design") return { kind: "design" as const, slugs: [] };
  if (value === "elements") return { kind: "elements" as const, slugs: [] };
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
  return { kind: "docs" as const, slugs: value.split("/").filter(Boolean) };
}

function listPages(path: string | undefined) {
  const pages = allPages().map(({ page }) => pageSummary(page));
  if (!path) return pages;
  const under = (prefix: string) =>
    pages.filter(
      (page) => page.url === prefix || page.url.startsWith(`${prefix}/`),
    );

  // A folder whose overview moved keeps its other pages, so the move applies
  // only to a prefix with no pages left under it.
  const pathname = normalizePathname(path);
  const direct = pathname ? under(`/${pathname}`) : pages;
  return direct.length > 0 ? direct : under(normalizePageUrlPrefix(path));
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
    sites: DOCS_SITES.map((site) => ({
      title: site.title,
      url: docsSiteBaseUrl(site.id),
      children: siteTree(site.id).children.map(serializeNode),
    })),
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

class PageNotFoundError extends Error {}

function findDocsPage(slugs: string[]) {
  const page = source.getPage(slugs) ?? docsOverviewPage(source, slugs);
  if (page) return page;
  // An API name in another case: primitives/ThreadList is thread-list.
  const kebab = kebabCaseSlug(slugs);
  return kebab
    ? (source.getPage(kebab) ?? docsOverviewPage(source, kebab))
    : undefined;
}

// A miss names the nearest pages, as the markdown 404 does, so the agent's
// next call can be a read rather than another guess.
function pageNotFound(path: string) {
  const nearest = nearestPages(
    path,
    allPages().map(({ page }) => page),
    5,
  );
  return new PageNotFoundError(
    `Page not found: ${path}` +
      (nearest.length > 0
        ? `. Nearest pages: ${nearest.map((page) => page.url).join(", ")}`
        : ""),
  );
}

async function readPage(path: string | undefined, requestUrl: string) {
  if (!path) throw new Error("path is required");

  const normalized = normalizePath(path, requestUrl);
  if (normalized.kind === "elements" && normalized.slugs.length === 1) {
    const [slug] = normalized.slugs as [string];
    const gallery = elementsDocs.getPage(normalized.slugs)
      ? null
      : slug === "vocabulary"
        ? { title: "Component vocabulary", content: vocabularyMarkdown() }
        : elementGalleryPage(slug);
    if (gallery) return { ...gallery, url: `/elements/${slug}` };
  }
  const page =
    normalized.kind === "site"
      ? resolveDocsUrl(normalized.pathname)
      : normalized.kind === "examples"
        ? examples.getPage(normalized.slugs)
        : normalized.kind === "design"
          ? design.getPage(normalized.slugs)
          : normalized.kind === "elements"
            ? elementsDocs.getPage(normalized.slugs)
            : findDocsPage(normalized.slugs);

  if (!page) throw pageNotFound(path);

  return {
    title: page.data.title,
    url: page.url,
    content: await getLLMText(page),
  };
}

function elementGalleryPage(slug: string) {
  const content = elementGalleryMarkdown(slug);
  const element = getElement(slug);
  return content && element ? { title: element.title, content } : null;
}

function toolTextResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function stringifyToolResult(result: unknown) {
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

// A tool call refused because its rate-limit budget ran out, counted apart
// from failures.
class ToolThrottledError extends Error {}

// What a tool call is about, for the agent-read event: the search query (its
// empty results are the docs' search gaps), the page path asked for, or the
// prefix listed. Agent-typed text goes through agentText.
type ToolCallSubject = {
  query?: string | undefined;
  path?: string | undefined;
};

function toolResultCount(tool: string, result: unknown): number | undefined {
  if (Array.isArray(result)) return result.length;
  if (tool === listTemplatesTool.name) {
    return (result as { templates?: unknown[] }).templates?.length;
  }
  if (tool === readPageTool.name) return 1;
  return undefined;
}

// The template tools report a failure, such as a sandbox outage, in their
// result rather than by throwing.
function returnedError(result: unknown) {
  return (
    typeof result === "object" &&
    result !== null &&
    typeof (result as { error?: unknown }).error === "string"
  );
}

function toolCallStatus(error: unknown) {
  if (error instanceof ToolThrottledError) return "throttled";
  if (error instanceof PageNotFoundError) return "not_found";
  return "error";
}

async function toolResult(
  request: Request,
  tool: string,
  subject: ToolCallSubject,
  fn: () => unknown | Promise<unknown>,
) {
  const started = performance.now();
  const capture = (properties: AgentEventProperties) =>
    captureAgentEvent(request.headers, "mcp_tool_called", {
      tool,
      client: agentClientFamily(request.headers.get("user-agent")),
      latency_ms: Math.round(performance.now() - started),
      ...(subject.query !== undefined
        ? { query: agentText(subject.query) }
        : {}),
      ...(subject.path !== undefined ? { path: agentPath(subject.path) } : {}),
      ...properties,
    });

  try {
    const result = await fn();
    const count = toolResultCount(tool, result);
    capture({
      status: returnedError(result) ? "error" : count === 0 ? "empty" : "ok",
      result_count: count,
      ...(tool === readPageTool.name
        ? { page: (result as { url: string }).url }
        : {}),
    });
    return toolTextResult(stringifyToolResult(result));
  } catch (error) {
    capture({ status: toolCallStatus(error), result_count: 0 });
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
        hostUi: z
          .unknown()
          .optional()
          .describe(
            "The host page the assistant sits in: product name, navigation and page content. " +
              "Supported by webpage-assistant (deep-merged with defaults) and product-page-assistant (replaces the whole dashboard tree, so pass it complete). " +
              "base-assistant-ui has no hostUi. Shape: read_template configRoots.hostUi.",
          ),
        assistant: z
          .unknown()
          .optional()
          .describe(
            "The chat experience: names, welcome copy, labels, suggested prompts, tools and no-key demo flows. " +
              "Deep-merged with the template defaults, so include only the fields to change. Shape: read_template configRoots.assistant.",
          ),
        brandTheme: z
          .unknown()
          .optional()
          .describe(
            "Color tokens shared by the page and the chat, as hex colors such as #14b8a6. " +
              "Token names differ per template. base-assistant-ui takes a preset (assistantDark, assistantLight, neutralDark or neutralLight) plus optional 6-digit hex overrides. Shape: read_template configRoots.brandTheme.",
          ),
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

function registerResources(server: McpServer, request: Request) {
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

async function requireTemplateToolBudget(request: Request) {
  const denial = await checkMcpTemplateToolRateLimit(request);
  if (!denial) return;

  const suffix = " The assistant-ui docs tools remain available.";
  if (denial.status !== 429) {
    throw new Error(`Template tools are temporarily unavailable.${suffix}`);
  }
  throw new ToolThrottledError(await throttleMessage(denial, suffix));
}

async function requireDocsToolBudget(request: Request) {
  const denial = await checkMcpDocsToolRateLimit(request);
  // These tools cost one in-process render and nothing external, so a
  // rate-limit store outage serves them unmetered rather than taking the
  // surface down with it. Only an exhausted budget refuses.
  if (denial?.status !== 429) return;
  throw new ToolThrottledError(await throttleMessage(denial, ""));
}

function buildMcpServer(request: Request) {
  const server = new McpServer(
    { name: "assistant-ui-docs", version: "1.0.0" },
    {
      maxToolInputElements: 10_000,
      instructions: serverInstructions,
      // The tools, pages and prompt change only with a deploy, and this
      // stateless endpoint has no stream to announce a change on. Without
      // these, 2026-07-28 clients open a `subscriptions/listen` stream that
      // would hold a function open until its time limit.
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
        prompts: { listChanged: false },
      },
    },
  );
  const requestUrl = request.url;
  const requestOrigin = new URL(requestUrl).origin;

  server.registerTool(
    listPagesTool.name,
    {
      description: listPagesTool.description,
      inputSchema: listPagesInputSchema,
    },
    ({ path }) =>
      toolResult(request, listPagesTool.name, { path }, async () => {
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
      toolResult(request, getNavigationTool.name, {}, async () => {
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
      toolResult(request, searchDocsTool.name, { query }, async () => {
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
      toolResult(request, readPageTool.name, { path }, async () => {
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
      toolResult(request, listTemplatesTool.name, {}, async () => {
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
      toolResult(request, readTemplateTool.name, {}, async () => {
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
      toolResult(request, previewTemplateTool.name, {}, async () => {
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

async function getManifest() {
  "use cache";
  cacheLife("max");
  return {
    name: "assistant-ui-docs",
    protocol: "mcp",
    endpoints: ["/mcp", "/.well-known/mcp", "/docs/mcp"],
    tools: toolDefinitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
  };
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

  return jsonResponse(await getManifest());
}

// The SDK's error messages for a refused request, as fixed reasons: the
// message itself can quote what the client sent.
const MCP_REJECTION_REASONS: ReadonlyArray<readonly [string, RegExp]> = [
  ["unsupported-protocol-version", /unsupported protocol version/i],
  ["parse-error", /parse error/i],
  ["already-initialized", /already initialized|only one initialization/i],
  ["batch", /batch/i],
  ["not-acceptable", /not acceptable/i],
  ["unsupported-media-type", /unsupported media type/i],
  ["envelope", /_meta envelope|header names protocol revision/i],
  ["header-mismatch", /headers and body disagree/i],
  ["invalid-request", /not a valid json-rpc message/i],
  ["session", /session/i],
];

function mcpRejectionReason(body: unknown) {
  const message = (body as { error?: { message?: unknown } } | null)?.error
    ?.message;
  if (typeof message !== "string") return "unknown";
  for (const [reason, pattern] of MCP_REJECTION_REASONS) {
    if (pattern.test(message)) return reason;
  }
  return "other";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rpcMethod(message: unknown) {
  if (Array.isArray(message)) return "batch";
  if (!isRecord(message)) return undefined;
  return typeof message["method"] === "string"
    ? agentText(message["method"], 64)
    : "response";
}

// The client a new session names: `initialize` carries it in the 2025
// protocol, and the `server/discover` probe carries it in its `_meta`
// envelope in 2026-07-28, which has no `initialize`.
function sessionClient(message: unknown) {
  if (!isRecord(message) || !isRecord(message["params"])) return undefined;
  const params = message["params"];
  if (message["method"] === "initialize" && isRecord(params["clientInfo"])) {
    return {
      info: params["clientInfo"],
      protocolVersion: params["protocolVersion"],
    };
  }
  const meta = params["_meta"];
  if (
    message["method"] === "server/discover" &&
    isRecord(meta) &&
    isRecord(meta[CLIENT_INFO_META_KEY])
  ) {
    return {
      info: meta[CLIENT_INFO_META_KEY],
      protocolVersion: meta[PROTOCOL_VERSION_META_KEY],
    };
  }
  return undefined;
}

// One event when a client opens a session, with the name and version it
// reports: many clients send a bare `node` user-agent, so this is the only
// place their name shows. One event when a request is refused, with the
// reason and the JSON-RPC method, because the CDN logs show only the status.
function countMcpRequest(
  request: NextRequest,
  message: unknown,
  response: Response,
) {
  const client = agentClientFamily(request.headers.get("user-agent"));
  const protocolVersion = request.headers.get("mcp-protocol-version");

  if (response.status >= 400) {
    const body = response.clone();
    const method = rpcMethod(message);
    captureAgentEvent(request.headers, "mcp_request_rejected", async () => ({
      status: response.status,
      reason: mcpRejectionReason(await body.json().catch(() => null)),
      ...(method !== undefined ? { method } : {}),
      protocol_version:
        protocolVersion === null ? undefined : agentText(protocolVersion, 32),
      client,
    }));
    return;
  }

  const session = sessionClient(message);
  if (!session) return;
  captureAgentEvent(request.headers, "mcp_client_initialized", {
    client_name: agentText(String(session.info["name"]), 64),
    client_version: agentText(String(session.info["version"]), 32),
    protocol_version:
      typeof session.protocolVersion === "string"
        ? agentText(session.protocolVersion, 32)
        : undefined,
    client,
  });
}

// MCP 2026-07-28 has no `initialize`: a client opens with a `server/discover`
// probe and sends every request with the revision in `MCP-Protocol-Version`
// and a `_meta` envelope. Claude Code, the Go SDK and the TypeScript SDK in
// auto mode all probe first. The 2025 transport below refused the probe with
// a 400, so each of their sessions began with one refused request before it
// fell back to `initialize`. This handler serves that revision. It is strict:
// a request without the envelope is routed to the 2025 transport instead.
const modernMcp = createMcpHandler(
  ({ requestInfo }) => {
    if (!requestInfo) throw new Error("The docs MCP server serves HTTP only");
    return buildMcpServer(requestInfo);
  },
  { legacy: "reject" },
);

// The 2025 protocol, stateless: a fresh server and transport per request,
// answered with JSON rather than a stream.
async function serveLegacy(
  request: NextRequest,
  normalizedRequest: Request,
  options: { parsedBody: unknown } | undefined,
) {
  const server = buildMcpServer(request);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(normalizedRequest, options);
  } finally {
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  // An oversized body is left to the transports, which refuse it with a 413.
  const length = Number(request.headers.get("content-length"));
  if (length > DEFAULT_MAX_REQUEST_BODY_SIZE) return undefined;
  try {
    return (await request.clone().json()) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const normalizedRequest = await normalizeMcpRequestHeaders(request);
  // Parsed once for routing, both eras and the event. A body that is not
  // JSON is left to the 2025 transport, which answers it with a parse error.
  const message = await readJsonBody(normalizedRequest);
  const options = message === undefined ? undefined : { parsedBody: message };
  const response = (await isLegacyRequest(normalizedRequest, message))
    ? await serveLegacy(request, normalizedRequest, options)
    : await modernMcp.fetch(normalizedRequest, options);
  countMcpRequest(request, message, response);
  return response;
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
