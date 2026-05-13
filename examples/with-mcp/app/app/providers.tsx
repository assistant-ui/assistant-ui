"use client";

import type { ReactNode } from "react";
import { MCPProvider, defineConnector } from "@assistant-ui/react-mcp";

const connectors = [
  defineConnector({
    id: "local-test",
    name: "Local test MCP",
    url: "http://localhost:8787/mcp",
    auth: { type: "oauth", scopes: ["mcp"] },
  }),
];

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MCPProvider
      connectors={connectors}
      oauthRedirectUri={
        typeof window !== "undefined"
          ? `${window.location.origin}/mcp/callback`
          : undefined
      }
    >
      {children}
    </MCPProvider>
  );
}
