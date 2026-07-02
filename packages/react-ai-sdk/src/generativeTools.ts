import { jsonSchema, type ToolSet } from "ai";
import type { MCPClient, MCPClientConfig } from "@ai-sdk/mcp";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "#mcp-stdio";
import {
  toJSONSchema,
  type Tool,
  type McpServerConfig,
  type ToolJSONSchema,
  type ToolModelOutputFunction,
} from "assistant-stream";
import type { Toolkit, ToolkitDefinition } from "@assistant-ui/core/react";
import { frontendTools } from "./frontendTools";
import { toAISDKContent, toAISDKDefaultOutput } from "./toolOutputConversion";
import {
  unwrapModelContentEnvelope,
  type ModelContentEnvelope,
} from "./modelContentEnvelope";

const EMPTY_SCHEMA = { type: "object" as const, properties: {} };

const humanNotSupported = (): never => {
  throw new Error(
    "`human()` is not available during server-side tool execution.",
  );
};

// AI SDK leaves `abortSignal` optional; assistant-ui's execute requires one.
const neverAbort = new AbortController().signal;

const parametersToInputSchema = (parameters: Tool["parameters"] | undefined) =>
  jsonSchema(parameters ? toJSONSchema(parameters) : EMPTY_SCHEMA);

/**
 * @deprecated Options for the deprecated {@link generativeTools}. Use
 * {@link AISDKToolkit} with {@link AISDKToolkitOptions} /
 * {@link AISDKToolkitToolsOptions} instead.
 */
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
 * tools that aren't in the static toolkit.
 *
 * @deprecated Use {@link AISDKToolkit} instead:
 * `new AISDKToolkit({ toolkit }).tools({ frontend })`. It is a strict superset
 * (it also opens MCP server connections), so it replaces `generativeTools`
 * everywhere. The `frontendTools` option is named `frontend` on `.tools()`, and
 * `.tools()` is async. `generativeTools` will be removed in a future version.
 *
 * @example
 * ```ts
 * // Define once at module scope so any MCP connections pool across requests.
 * const aiToolkit = new AISDKToolkit({ toolkit: docsToolkit });
 *
 * // In your route handler:
 * const { tools } = await req.json();
 * streamText({
 *   model,
 *   messages,
 *   tools: await aiToolkit.tools({ frontend: tools }),
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
    ...toProviderToolSet(options.toolkit),
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
    const frontendToolSet = options.frontend
      ? frontendTools(options.frontend)
      : {};
    const mcpToolSet = await this.#mcpTools();
    const providerToolSet = toProviderToolSet(this.#toolkit);
    const serverToolSet = toServerToolSet(this.#toolkit as ToolkitDefinition);

    assertNoMcpToolNameCollisions(mcpToolSet, [
      { source: "frontend", tools: frontendToolSet },
      { source: "provider", tools: providerToolSet },
      { source: "toolkit", tools: serverToolSet },
    ]);

    return {
      ...frontendToolSet,
      ...mcpToolSet.tools,
      ...providerToolSet,
      ...serverToolSet,
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
      throw new AggregateError(
        errors,
        "Failed to close one or more MCP clients",
      );
    }
  }

  async #mcpTools(): Promise<McpToolSet> {
    const toolSets = await Promise.all(
      Object.entries(this.#toolkit)
        .filter((entry): entry is [string, McpToolkitTool] =>
          isMcpToolkitTool(entry[1]),
        )
        .map(async ([name, tool]) => {
          const client = await this.#mcpClient(name, tool.server);
          return [name, tool.prefix ?? "", await client.tools()] as const;
        }),
    );

    const tools: ToolSet = {};
    const toolSources = new Map<string, string>();
    for (const [serverName, prefix, toolSet] of toolSets) {
      for (const [toolName, tool] of Object.entries(toolSet)) {
        const exposedName = `${prefix}${toolName}`;
        const existingServerName = toolSources.get(exposedName);
        if (existingServerName) {
          throw new Error(
            `MCP tool name collision: "${exposedName}" is exposed by both "${existingServerName}" and "${serverName}". Rename one of the toolkit entries or expose distinct MCP tool names.`,
          );
        }
        toolSources.set(exposedName, serverName);
        tools[exposedName] = tool;
      }
    }
    return { tools, sources: toolSources };
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
  prefix?: string | undefined;
};

type McpToolSet = {
  tools: ToolSet;
  sources: Map<string, string>;
};

const assertNoMcpToolNameCollisions = (
  mcp: McpToolSet,
  toolSets: readonly { source: string; tools: ToolSet }[],
): void => {
  for (const [toolName, serverName] of mcp.sources) {
    for (const { source, tools } of toolSets) {
      if (!Object.prototype.hasOwnProperty.call(tools, toolName)) continue;
      throw new Error(
        `MCP tool "${toolName}" from "${serverName}" conflicts with ${source} tool "${toolName}". Rename one of the tools so each model-visible tool name is unique.`,
      );
    }
  }
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

type AISDKToModelOutputOptions<TArgs, TResult> = Omit<
  Parameters<ToolModelOutputFunction<TArgs, TResult>>[0],
  "output"
> & {
  output: TResult | ModelContentEnvelope<TResult>;
};

const toAISDKToModelOutput =
  <TArgs, TResult>(toModelOutput?: ToolModelOutputFunction<TArgs, TResult>) =>
  async (options: AISDKToModelOutputOptions<TArgs, TResult>) => {
    const { result, modelContent } = unwrapModelContentEnvelope(options.output);

    if (modelContent !== undefined) {
      return toAISDKContent(modelContent);
    }

    if (!toModelOutput) {
      return toAISDKDefaultOutput(result);
    }

    const parts = await toModelOutput({
      ...options,
      output: result,
    });
    return toAISDKContent(parts);
  };

const toServerToolSet = (toolkit: ToolkitDefinition): ToolSet =>
  Object.fromEntries(
    Object.entries(toolkit)
      .filter(
        ([, t]) => t.type !== "mcp" && t.type !== "provider" && !t.disabled,
      )
      .map(([name, t]) => {
        const execute = t.execute;
        return [
          name,
          {
            ...(t.description !== undefined && { description: t.description }),
            inputSchema: parametersToInputSchema(t.parameters),
            toModelOutput: toAISDKToModelOutput(t.toModelOutput),
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

const toProviderToolSet = (toolkit: Toolkit): ToolSet =>
  Object.fromEntries(
    Object.entries(toolkit)
      .filter((entry): entry is [string, ProviderToolkitTool] =>
        isProviderToolkitTool(entry[1]),
      )
      .map(([name, t]) => [
        name,
        {
          type: "provider",
          id: t.providerId,
          args: t.args,
          ...(t.parameters && {
            inputSchema: parametersToInputSchema(t.parameters),
          }),
          ...(t.providerOptions && { providerOptions: t.providerOptions }),
          ...(t.supportsDeferredResults !== undefined && {
            supportsDeferredResults: t.supportsDeferredResults,
          }),
        },
      ]),
  ) as ToolSet;

type ProviderToolkitTool = Extract<Toolkit[string], { type: "provider" }>;

const isProviderToolkitTool = (
  tool: Toolkit[string],
): tool is ProviderToolkitTool => tool.type === "provider" && !tool.disabled;
