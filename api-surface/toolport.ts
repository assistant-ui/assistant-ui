type CliIo = {
  readonly argv: readonly string[];
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
};

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type JsonSchema = {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  items?: JsonSchema;
  enum?: readonly unknown[];
  default?: unknown;
  [key: string]: unknown;
};

declare const MCP_PROTOCOL_VERSION = "2025-06-18";

type McpStdioIo = {
  readonly input: AsyncIterable<string | Uint8Array>;
  readonly write: (line: string) => void;
};

type ModelContext = {
  registerTool?: (tool: WebMcpToolRegistration) => void;
  unregisterTool?: (name: string) => void;
  provideContext?: (context: {
    tools: WebMcpToolRegistration[];
  }) => void;
};

type Tool<Args = unknown, Result = unknown> = {
  readonly description: string;
  readonly parameters: JsonSchema;
  execute(args: Args, ctx: ToolContext): Result | Promise<Result>;
};

type ToolContext = {
  readonly toolkit: string;
  readonly tool: string;
  readonly signal: AbortSignal;
};

type ToolDescriptor = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
};

declare class ToolError extends Error {
  readonly code: ToolErrorCode;
  constructor(message: string, code: ToolErrorCode);
}

type ToolErrorCode = "execution_failed" | "invalid_args" | "unknown_tool";

type Toolkit<Tools extends Record<string, Tool> = Record<string, Tool>> = {
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly tools: Tools;
};

type WebMcpToolRegistration = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly execute: (args: unknown) => Promise<unknown>;
};

declare const callTool: (toolkit: Toolkit, name: string, args: unknown, options?: {
  signal?: AbortSignal;
}) => Promise<unknown>;

declare namespace entry_cli_exports {
  export { CliIo, parseToolArgs, runCli, serveCli };
}

declare const createMcpFetchHandler: (toolkit: Toolkit) => (request: Request) => Promise<Response>;

declare const defineToolkit: <Tools extends Record<string, Tool>>(toolkit: Toolkit<Tools>) => Toolkit<Tools>;

declare const handleMcpMessage: (toolkit: Toolkit, message: JsonRpcRequest) => Promise<JsonRpcResponse | null>;

declare namespace entry_root_exports {
  export { JsonSchema, Tool, ToolContext, ToolDescriptor, ToolError, Toolkit, callTool, defineToolkit, listTools, tool, validateArgs };
}

declare const listTools: (toolkit: Toolkit) => ToolDescriptor[];

declare namespace entry_mcp_exports {
  export { JsonRpcId, JsonRpcRequest, JsonRpcResponse, MCP_PROTOCOL_VERSION, McpStdioIo, createMcpFetchHandler, handleMcpMessage, serveMcpStdio };
}

declare const parseToolArgs: (schema: JsonSchema, argv: readonly string[]) => Record<string, unknown>;

declare const registerWebMcp: (toolkit: Toolkit, modelContext?: ModelContext | undefined) => (() => void);

declare const runCli: (toolkit: Toolkit, io: CliIo) => Promise<number>;

declare const serveCli: (toolkit: Toolkit) => Promise<void>;

declare const serveMcpStdio: (toolkit: Toolkit, io?: McpStdioIo) => Promise<void>;

declare const toWebMcpTools: (toolkit: Toolkit) => WebMcpToolRegistration[];

declare const tool: <Args, Result>(definition: Tool<Args, Result>) => Tool<Args, Result>;

declare const validateArgs: (schema: JsonSchema, args: unknown) => string[];

declare namespace entry_webmcp_exports {
  export { ModelContext, WebMcpToolRegistration, registerWebMcp, toWebMcpTools };
}

export { entry_cli_exports as entry_cli, entry_mcp_exports as entry_mcp, entry_root_exports as entry_root, entry_webmcp_exports as entry_webmcp };
