import { useMemo } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { MCPServerState } from "../mcp-scope";

export type MCPRuntimeTool = {
  serverId: string;
  name: string;
  description?: string | undefined;
  parameters: unknown;
  execute: (args: unknown) => Promise<unknown>;
};

export type UseMcpToolsOptions = {
  /** Filter which servers contribute tools. Default: all connected servers. */
  filter?: ((server: MCPServerState) => boolean) | undefined;
};

export type UseMcpToolsResult = {
  tools: Record<string, MCPRuntimeTool>;
  byServer: Record<string, MCPRuntimeTool[]>;
};

/**
 * Aggregates enabled tools across MCP servers, returning a runtime-agnostic shape.
 *
 * Tool names are prefixed with `serverId__` to avoid collisions across servers.
 */
export function useMcpTools(opts: UseMcpToolsOptions = {}): UseMcpToolsResult {
  const aui = useAui();

  // Subscribe to a primitive signature so we only re-aggregate on real change.
  const signature = useAuiState((s) => {
    return s.mcp.servers
      .map((server) => {
        if (server.connectionState !== "connected") return null;
        if (opts.filter && !opts.filter(server)) return null;
        return `${server.id}|${server.tools.map((t) => t.name).join(",")}`;
      })
      .filter(Boolean)
      .join("||");
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: `signature` is the only change driver
  return useMemo(() => {
    const tools: Record<string, MCPRuntimeTool> = {};
    const byServer: Record<string, MCPRuntimeTool[]> = {};
    const servers = aui.mcp().getState().servers;
    for (const server of servers) {
      if (server.connectionState !== "connected") continue;
      if (opts.filter && !opts.filter(server)) continue;
      const serverTools: MCPRuntimeTool[] = [];
      for (const tool of server.tools) {
        const runtimeTool: MCPRuntimeTool = {
          serverId: server.id,
          name: tool.name,
          parameters: tool.inputSchema,
          execute: async (args) =>
            await aui.mcp().server({ id: server.id }).callTool(tool.name, args),
        };
        if (tool.description !== undefined) {
          runtimeTool.description = tool.description;
        }
        tools[`${server.id}__${tool.name}`] = runtimeTool;
        serverTools.push(runtimeTool);
      }
      byServer[server.id] = serverTools;
    }
    return { tools, byServer };
  }, [aui, signature, opts.filter]);
}

/**
 * Adapter for Vercel AI SDK tool shape. Zero-dep on `ai` itself.
 */
export type AiSdkToolShape = {
  description?: string | undefined;
  parameters: unknown;
  execute: (args: unknown) => Promise<unknown>;
};

export function mcpRuntimeToolsToAiSdkTools(
  tools: Record<string, MCPRuntimeTool>,
): Record<string, AiSdkToolShape> {
  const out: Record<string, AiSdkToolShape> = {};
  for (const [key, t] of Object.entries(tools)) {
    const entry: AiSdkToolShape = {
      parameters: t.parameters,
      execute: t.execute,
    };
    if (t.description !== undefined) entry.description = t.description;
    out[key] = entry;
  }
  return out;
}
