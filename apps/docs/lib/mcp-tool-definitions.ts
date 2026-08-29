export const SEARCH_DOCS_RESULT_LIMIT = 20;

export const searchDocsInputSchema = {
  type: "object",
  properties: {
    query: { type: "string", description: "Search query." },
  },
  required: ["query"],
  additionalProperties: false,
} as const;

export const readPageInputSchema = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description:
        "Page path such as /docs/installation, /docs/installation.md, examples/ai-sdk, design/components/tabs, elements/reasoning, tap/docs/store/state, or a same-origin URL.",
    },
  },
  required: ["path"],
  additionalProperties: false,
} as const;

export const docsToolDefinitions = [
  {
    name: "list_pages",
    description:
      "List assistant-ui documentation pages. Optionally filter by a URL path prefix such as /docs/tools, /examples, /design, /elements, or /tap/docs.",
  },
  {
    name: "get_navigation",
    description: "Return the assistant-ui docs navigation tree.",
  },
  {
    name: "search_docs",
    description:
      "Search assistant-ui docs, examples, design components, elements, and Tap docs by title, description, or URL.",
    inputSchema: searchDocsInputSchema,
  },
  {
    name: "read_page",
    description:
      "Read one assistant-ui docs, examples, design, elements, or Tap docs page as markdown. Accepts a slug, path, .md URL, or same-origin URL.",
    inputSchema: readPageInputSchema,
  },
] as const;

export const [listPagesTool, getNavigationTool, searchDocsTool, readPageTool] =
  docsToolDefinitions;
