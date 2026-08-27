// Shared between the MCP route (app/api/mcp/route.ts) and the WebMCP client
// surface (lib/webmcp-tools.ts) so wire names, descriptions, and the search
// result cap cannot drift apart. Follows the normalize-mcp-headers.ts pattern
// of lifting route pieces that need a second consumer into a sibling module.

export const SEARCH_DOCS_RESULT_LIMIT = 20;

export const toolDefinitions = [
  {
    name: "list_pages",
    description:
      "List assistant-ui documentation pages. Optionally filter by a URL path prefix such as /docs/tools, /examples, /design, /standalone, or /tap/docs.",
  },
  {
    name: "get_navigation",
    description: "Return the assistant-ui docs navigation tree.",
  },
  {
    name: "search_docs",
    description:
      "Search assistant-ui docs, examples, design components, and Tap docs by title, description, or URL.",
  },
  {
    name: "read_page",
    description:
      "Read one assistant-ui docs, examples, design, or Tap docs page as markdown. Accepts a slug, path, .md URL, or same-origin URL.",
  },
] as const;

export const [listPagesTool, getNavigationTool, searchDocsTool, readPageTool] =
  toolDefinitions;
