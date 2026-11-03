"use client";

import {
  McpServerPanel,
  type McpServer,
} from "@/components/assistant-ui/elements/mcp-server-panel";
import { defineStates } from "./types";

const noop = () => {};

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

const handlers = { onToggle: noop, onAuthorize: noop };

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "requires-action",
    label: "Needs auth",
    note: "A server waits on the user to authorize before its tools load.",
    Component: () => (
      <McpServerPanel servers={SERVERS} expandedId="linear" {...handlers} />
    ),
  },
  {
    key: "connecting",
    label: "Connecting",
    note: "Servers are still starting up and have not reported tools yet.",
    Component: () => (
      <McpServerPanel
        servers={SERVERS.map((server) =>
          server.id === "github"
            ? server
            : { ...server, status: "connecting" as const, tools: [] },
        )}
        expandedId="fs"
        {...handlers}
      />
    ),
  },
  {
    key: "failed",
    label: "Failed",
    note: "One server could not start, so it shows a red dot and no tools.",
    Component: () => (
      <McpServerPanel
        servers={[
          SERVERS[0]!,
          {
            id: "postgres",
            name: "postgres",
            transport: "stdio",
            status: "failed",
            tools: [],
          },
          SERVERS[2]!,
        ]}
        expandedId="postgres"
        {...handlers}
      />
    ),
  },
  {
    key: "empty",
    label: "No servers",
    note: "No servers are configured, so only the header shows.",
    Component: () => <McpServerPanel servers={[]} {...handlers} />,
  },
  {
    key: "long-content",
    label: "Many tools",
    note: "A long server name truncates and a long tool list wraps.",
    Component: () => (
      <McpServerPanel
        servers={[
          {
            id: "atlassian",
            name: "atlassian-confluence-enterprise.internal.acme.dev",
            transport: "streamable-http",
            status: "connected",
            tools: [
              "search_pages",
              "get_page",
              "create_page",
              "update_page",
              "list_spaces",
              "get_space",
              "list_comments",
              "add_comment",
              "search_issues",
              "get_issue",
              "create_issue",
              "transition_issue",
              "add_worklog",
              "list_boards",
            ],
          },
          SERVERS[2]!,
        ]}
        expandedId="atlassian"
        {...handlers}
      />
    ),
  },
]);
