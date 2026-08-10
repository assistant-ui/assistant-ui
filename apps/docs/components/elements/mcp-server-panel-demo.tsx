"use client";

import { useState } from "react";
import {
  McpServerPanel,
  type McpServer,
} from "@/components/elements/mcp-server-panel";

const SERVERS: readonly McpServer[] = [
  {
    id: "github",
    name: "github-mcp",
    transport: "streamable-http",
    status: "connected",
    tools: ["list_issues", "create_pr", "get_diff"],
  },
  {
    id: "linear",
    name: "linear",
    transport: "sse",
    status: "needs-auth",
    tools: ["list_issues", "save_issue"],
  },
  {
    id: "fs",
    name: "filesystem",
    transport: "stdio",
    status: "connected",
    tools: ["read_file", "write_file"],
  },
];

export function McpServerPanelDemo() {
  const [expandedId, setExpandedId] = useState("github");
  const [authorized, setAuthorized] = useState(false);

  return (
    <McpServerPanel
      servers={SERVERS.map((server) =>
        authorized && server.id === "linear"
          ? { ...server, status: "connected" as const }
          : server,
      )}
      expandedId={expandedId}
      onToggle={(id) => setExpandedId((current) => (current === id ? "" : id))}
      onAuthorize={() => setAuthorized(true)}
    />
  );
}
