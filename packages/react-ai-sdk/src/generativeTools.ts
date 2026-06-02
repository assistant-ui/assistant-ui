import { jsonSchema, type ToolSet } from "ai";
import type { MCPClient, MCPClientConfig } from "@ai-sdk/mcp";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import {
  toJSONSchema,
  type McpServerConfig,
  type ToolJSONSchema,
} from "assistant-stream";
import type { Toolkit, ToolkitDefinition } from "@assistant-ui/core/react";
import { defaultToModelOutput, frontendTools } from "./frontendTools";

const EMPTY_SCHEMA = { type: "object" as const, properties: {} };

const humanNotSupported = (): never => {
  throw new Error(
    "`human()` is not available during server-side tool execution.",
  );
};

// AI SDK leaves `abortSignal` optional; assistant-ui's execute requires one.
const neverAbort = new AbortController().signal;

export interface GenerativeToolsOptions {
  /**
   * The server build of a generative toolkit (schema + server `execute`). Typed
   * as the canonical {@link Toolkit} so callers don't need to cast; the server
   * build carries `execute`, recovered internally as {@link ToolkitDefinition}.
   */
  toolkit: Toolkit;
  /**
   * Tools uploaded by the frontend (the request body's `tools`). Merged in
   * alongside the `toolkit`; a server `execute` from `toolkit` takes precedence
   * over an uploaded entry of the same name.
   */
  frontendTools?: Record<string, ToolJSONSchema>;
}

export type AISDKToolkitOptions = {
  toolkit: Toolkit;
};

export type AISDKToolkitToolsOptions = {
  /**
   * Tools uploaded by the frontend request body.
   */
  frontend?: Record<string, ToolJSONSchema>;
};

/**
 * Builds an AI SDK `ToolSet` for server-side use with `streamText` /
 * `generateText` from a generative `toolkit` and the frontend-uploaded tools.
 *
 * Each toolkit tool's `execute` runs on the server. Pair this with the
 * `"use generative"` compiler: import the toolkit in a server route (where it
 * resolves to the server build — schema + `execute`, with `render` stripped) and
 * pass it here. Tools without an `execute` are still exposed to the model but
 * left for the client to fulfill. `frontendTools` lets the client contribute
 * tools that aren't in the static toolkit. Use {@link AISDKToolkit} when the
 * toolkit contains MCP entries.
 *
 * @example
 * ```ts
 * const { tools } = await req.json();
 * streamText({
 *   model,
 *   messages,
 *   tools: generativeTools({ toolkit: docsToolkit, frontendTools: tools }),
 * });
 * ```
 */
export const generativeTools = (options: GenerativeToolsOptions): ToolSet => {
  assertNoMcpToolkitTools(options.toolkit);
  return {
    ...(options.frontendTools ? frontendTools(options.frontendTools) : {}),
    // `toolkit` last so its server-side `execute` wins over an uploaded entry of
    // the same name. The cast recovers the declaration shape — the server build
    // carries `execute`, which the canonical `Toolkit` type erases.
    ...toServerToolSet(options.toolkit as ToolkitDefinition),
  };
};

export class AISDKToolkit {
  readonly #toolkit: Toolkit;
  readonly #mcpClients = new Map<string, Promise<MCPClient>>();

  constructor(options: AISDKToolkitOptions) {
    this.#toolkit = options.toolkit;
  }

  async tools(options: AISDKToolkitToolsOptions = {}): Promise<ToolSet> {
    return {
      ...(options.frontend ? frontendTools(options.frontend) : {}),
      ...(await this.#mcpTools()),
      ...toServerToolSet(this.#toolkit as ToolkitDefinition),
    };
  }

  async close(): Promise<void> {
    const clientPromises = [...this.#mcpClients.values()];
    this.#mcpClients.clear();
    const results = await Promise.allSettled(clientPromises);
    const clients = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const closeResults = await Promise.allSettled(
      clients.map((client) => client.close()),
    );
    const errors = [
      ...results.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      ),
      ...closeResults.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      ),
    ];
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      const error = new Error("Failed to close one or more MCP clients");
      (error as Error & { errors: unknown[] }).errors = errors;
      throw error;
    }
  }

  async #mcpTools(): Promise<ToolSet> {
    const toolSets = await Promise.all(
      Object.entries(this.#toolkit)
        .filter((entry): entry is [string, McpToolkitTool] =>
          isMcpToolkitTool(entry[1]),
        )
        .map(async ([name, tool]) => {
          const client = await this.#mcpClient(name, tool.server);
          return [name, await client.tools()] as const;
        }),
    );

    const tools: ToolSet = {};
    const toolSources = new Map<string, string>();
    for (const [serverName, toolSet] of toolSets) {
      for (const [toolName, tool] of Object.entries(toolSet)) {
        const existingServerName = toolSources.get(toolName);
        if (existingServerName) {
          throw new Error(
            `MCP tool name collision: "${toolName}" is exposed by both "${existingServerName}" and "${serverName}". Rename one of the toolkit entries or expose distinct MCP tool names.`,
          );
        }
        toolSources.set(toolName, serverName);
        tools[toolName] = tool;
      }
    }
    return tools;
  }

  #mcpClient(name: string, config: McpServerConfig): Promise<MCPClient> {
    const existing = this.#mcpClients.get(name);
    if (existing) return existing;
    let next: Promise<MCPClient>;
    next = createMCPClient(toMCPClientConfig(config)).catch((error) => {
      if (this.#mcpClients.get(name) === next) {
        this.#mcpClients.delete(name);
      }
      throw error;
    });
    this.#mcpClients.set(name, next);
    return next;
  }
}

const toMCPClientConfig = (config: McpServerConfig): MCPClientConfig => {
  if (config.type === "stdio") {
    return {
      transport: new Experimental_StdioMCPTransport({
        command: config.command,
        ...(config.args && { args: [...config.args] }),
        ...(config.env && { env: config.env }),
        ...(config.cwd && { cwd: config.cwd }),
      }),
    };
  }

  return {
    transport: {
      type: config.type,
      url: config.url,
      ...(config.headers && { headers: config.headers }),
      ...(config.redirect && { redirect: config.redirect }),
    },
  };
};

type ToolkitTool = Toolkit[string];

type McpToolkitTool = ToolkitTool & {
  type: "mcp";
  server: McpServerConfig;
};

const isMcpToolkitTool = (tool: ToolkitTool): tool is McpToolkitTool =>
  tool.type === "mcp" && !tool.disabled;

const assertNoMcpToolkitTools = (toolkit: Toolkit): void => {
  const mcpToolName = Object.entries(toolkit).find(([, tool]) =>
    isMcpToolkitTool(tool),
  )?.[0];
  if (!mcpToolName) return;

  throw new Error(
    `MCP toolkit entry "${mcpToolName}" requires AISDKToolkit. Use new AISDKToolkit({ toolkit }).tools(...) instead of generativeTools(...).`,
  );
};

const toServerToolSet = (toolkit: ToolkitDefinition): ToolSet =>
  Object.fromEntries(
    Object.entries(toolkit)
      .filter(([, t]) => t.type !== "mcp" && !t.disabled)
      .map(([name, t]) => {
        const execute = t.execute;
        return [
          name,
          {
            ...(t.description !== undefined && { description: t.description }),
            inputSchema: jsonSchema(
              t.parameters ? toJSONSchema(t.parameters) : EMPTY_SCHEMA,
            ),
            toModelOutput: t.toModelOutput ?? defaultToModelOutput,
            ...(t.providerOptions && { providerOptions: t.providerOptions }),
            ...(execute && {
              execute: (
                args: unknown,
                callOptions: { toolCallId: string; abortSignal?: AbortSignal },
              ) =>
                execute(args as never, {
                  toolCallId: callOptions.toolCallId,
                  abortSignal: callOptions.abortSignal ?? neverAbort,
                  human: humanNotSupported,
                }),
            }),
          },
        ];
      }),
  ) as ToolSet;
