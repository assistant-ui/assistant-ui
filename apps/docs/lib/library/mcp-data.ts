export const MCP_URL = "https://www.assistant-ui.com/mcp";
export const MCP_COMMAND = "npx assistant-ui@latest mcp";
export const MCP_PROMPT = `Connect this editor to the assistant-ui MCP server at ${MCP_URL} (Streamable HTTP)`;

const STDIO_PACKAGE = "@assistant-ui/mcp-docs-server";

const json = (value: unknown) => JSON.stringify(value, null, 2);

export type McpEditorId =
  | "cursor"
  | "windsurf"
  | "vscode"
  | "zed"
  | "claude-code"
  | "claude-desktop";

export type McpEditor = {
  id: McpEditorId;
  label: string;
  /** The CLI command that sets this editor up. */
  command: string;
  /** Hosted editors call the endpoint; the others launch the local package, which proxies to it. */
  transport: "hosted" | "local";
  /** What the command does, for doing it by hand. */
  manual:
    | {
        /** The config file, per platform when it differs. */
        files: readonly { path: string; where?: string }[];
        config: string;
      }
    | { command: string };
  /** What is left to do in the editor. */
  after: string;
};

export const MCP_EDITORS: readonly McpEditor[] = [
  {
    id: "cursor",
    label: "Cursor",
    command: `${MCP_COMMAND} --cursor`,
    transport: "hosted",
    manual: {
      files: [{ path: ".cursor/mcp.json", where: "in your project" }],
      config: json({ mcpServers: { "assistant-ui": { url: MCP_URL } } }),
    },
    after: "Open Cursor Settings, go to MCP, find assistant-ui, and enable it.",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    command: `${MCP_COMMAND} --windsurf`,
    transport: "hosted",
    manual: {
      files: [{ path: "~/.codeium/windsurf/mcp_config.json" }],
      config: json({
        mcpServers: { "assistant-ui": { serverUrl: MCP_URL } },
      }),
    },
    after: "Fully quit Windsurf and open it again.",
  },
  {
    id: "vscode",
    label: "VS Code",
    command: `${MCP_COMMAND} --vscode`,
    transport: "hosted",
    manual: {
      files: [{ path: ".vscode/mcp.json", where: "in your project" }],
      config: json({
        servers: { "assistant-ui": { type: "http", url: MCP_URL } },
      }),
    },
    after:
      "In Settings, search for MCP and turn on Chat > MCP. Then use GitHub Copilot Chat in Agent mode.",
  },
  {
    id: "zed",
    label: "Zed",
    command: `${MCP_COMMAND} --zed`,
    transport: "local",
    manual: {
      files: [
        { path: "~/.config/zed/settings.json", where: "macOS and Linux" },
        { path: "%APPDATA%\\Zed\\settings.json", where: "Windows" },
      ],
      config: json({
        context_servers: {
          "assistant-ui": {
            command: { path: "npx", args: ["-y", STDIO_PACKAGE] },
          },
        },
      }),
    },
    after: "Open the Assistant Panel. The server starts with it.",
  },
  {
    id: "claude-code",
    label: "Claude Code",
    command: `${MCP_COMMAND} --claude-code`,
    transport: "hosted",
    manual: {
      command: `claude mcp add --transport http assistant-ui ${MCP_URL}`,
    },
    after: "Nothing. The server is available as soon as it is added.",
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    command: `${MCP_COMMAND} --claude-desktop`,
    transport: "local",
    manual: {
      files: [
        {
          path: "~/Library/Application Support/Claude/claude_desktop_config.json",
          where: "macOS",
        },
        {
          path: "%APPDATA%\\Claude\\claude_desktop_config.json",
          where: "Windows",
        },
      ],
      config: json({
        mcpServers: {
          "assistant-ui": { command: "npx", args: ["-y", STDIO_PACKAGE] },
        },
      }),
    },
    after: "Restart Claude Desktop.",
  },
];

export const MCP_LOCAL_PACKAGE = STDIO_PACKAGE;

export type McpTool = {
  name: string;
  description: string;
};

export type McpToolGroup = {
  id: string;
  title: string;
  description: string;
  tools: readonly McpTool[];
};

export const MCP_TOOL_GROUPS: readonly McpToolGroup[] = [
  {
    id: "docs",
    title: "Docs",
    description: "Look up the documentation, examples, and components.",
    tools: [
      {
        name: "search_docs",
        description:
          "Search docs, examples, design components, elements, and Tap docs, with an excerpt per result.",
      },
      {
        name: "read_page",
        description: "Read one page as markdown by slug, path, or URL.",
      },
      {
        name: "list_pages",
        description:
          "List documentation pages, optionally under a path such as /docs/tools or /examples.",
      },
      {
        name: "get_navigation",
        description: "Return the docs navigation tree.",
      },
    ],
  },
  {
    id: "templates",
    title: "Templates",
    description: "Start an app from a hosted template.",
    tools: [
      {
        name: "list_templates",
        description: "List the hosted app templates and fixed demos.",
      },
      {
        name: "read_template",
        description:
          "Get a template's config schemas, rules, and an example config.",
      },
      {
        name: "preview_template",
        description:
          "Create a configured preview and return its preview and download URLs.",
      },
    ],
  },
];

export const MCP_TOOL_COUNT = MCP_TOOL_GROUPS.reduce(
  (total, group) => total + group.tools.length,
  0,
);
