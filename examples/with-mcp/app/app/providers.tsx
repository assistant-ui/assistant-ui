"use client";

import type { ReactNode } from "react";
import { AssistantRuntimeProvider, AuiConfig } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { McpManagerResource, defineConnector } from "@assistant-ui/react-mcp";

const connectors = [
  defineConnector({
    id: "local-test",
    name: "Local test MCP",
    url: "http://localhost:8787/mcp",
    auth: { type: "oauth", scopes: ["mcp"] },
  }),
];

export function Providers({ children }: { children: ReactNode }) {
  const config = AuiConfig({ mcp: McpManagerResource({ connectors }) });
  const runtime = useChatRuntime();
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      {children}
    </AssistantRuntimeProvider>
  );
}
