import { useState } from "react";
import {
  McpServerPanel,
  type McpServer,
} from "@assistant-ui/ui/components/assistant-ui/elements/mcp-server-panel.tsx";
import { defineSections } from "../types";

const SERVERS: readonly McpServer[] = [
  {
    id: "github",
    name: "github-mcp",
    transport: "streamable-http",
    status: "connected",
    tools: [
      "list_issues",
      "create_pr",
      "get_diff",
      "search_code_across_every_repository",
    ],
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
    status: "connecting",
    tools: [],
  },
  {
    id: "db",
    name: "postgres-analytics-readonly-replica",
    transport: "stdio",
    status: "failed",
    tools: ["query"],
  },
];

function InteractivePanel() {
  const [expandedId, setExpandedId] = useState("github");
  const [authorized, setAuthorized] = useState<string[]>([]);
  return (
    <McpServerPanel
      servers={SERVERS.map((server) =>
        authorized.includes(server.id)
          ? { ...server, status: "connected" as const }
          : server,
      )}
      expandedId={expandedId}
      onToggle={(id) => setExpandedId((current) => (current === id ? "" : id))}
      onAuthorize={(id) => setAuthorized((current) => [...current, id])}
    />
  );
}

export default defineSections([
  {
    id: "mcp-server-panel",
    title: "MCP server panel",
    category: "agents",
    notes:
      "Connected (expanded on its tools), needs auth, connecting and failed; authorize connects, a row toggles its tools.",
    render: () => <InteractivePanel />,
  },
]);
