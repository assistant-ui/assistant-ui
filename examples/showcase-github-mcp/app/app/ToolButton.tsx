"use client";

import { type ReactNode, useState } from "react";
import { useMcpManager } from "@assistant-ui/react-mcp";
import { useMCPAppContext } from "@assistant-ui/react";
import type { MCPAppMetadata, MCPAppResource } from "@assistant-ui/react";

type ToolResult = {
  toolName: string;
  args: unknown;
  raw: {
    content?: { type: string; text?: string }[];
    structuredContent?: unknown;
    _meta?: Record<string, unknown>;
  };
  app: MCPAppMetadata | null;
  resource: MCPAppResource | null;
};

function readMcpAppMeta(raw: ToolResult["raw"]): MCPAppMetadata | null {
  const uri = raw._meta?.["ui/resourceUri"];
  if (typeof uri !== "string" || !uri.startsWith("ui://")) return null;
  return { resourceUri: uri };
}

export function MCPAppFromCallButton({
  toolName,
  args,
  onResult,
  children,
}: {
  toolName: string;
  args: unknown;
  onResult: (r: ToolResult) => void;
  children: ReactNode;
}) {
  const mcp = useMcpManager();
  const ctx = useMCPAppContext();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      const raw = (await mcp
        .server({ id: "aui-github" })
        .callTool(toolName, args)) as ToolResult["raw"];

      const app = readMcpAppMeta(raw);
      const resource =
        app && ctx.loadResource ? await ctx.loadResource(app) : null;
      onResult({ toolName, args, raw, app, resource });
    } catch (err) {
      onResult({
        toolName,
        args,
        raw: {
          content: [
            {
              type: "text",
              text: err instanceof Error ? err.message : String(err),
            },
          ],
        },
        app: null,
        resource: null,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      style={{
        padding: "6px 12px",
        border: "1px solid #d0d7de",
        borderRadius: 6,
        background: pending ? "#eee" : "#fff",
        cursor: pending ? "default" : "pointer",
        fontSize: 13,
        opacity: pending ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
