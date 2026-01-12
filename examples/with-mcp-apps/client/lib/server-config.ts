/**
 * MCP Server configurations for the demo app.
 * Each widget can be enabled/disabled via the settings UI.
 */

export type TransportType = "stdio" | "sse" | "streamable-http";
export type ServerCategory = "openai-apps";

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  transport: TransportType;
  category: ServerCategory;
  command?: string;
  args?: string[];
  url?: string;
  defaultEnabled: boolean;
  uiCapability?: {
    registry: string;
    bundleHash: string;
  };
  toolIds?: string[];
}

export const MCP_SERVERS: MCPServerConfig[] = [
  {
    id: "pizzaz-node",
    name: "Pizzaz (Node)",
    description: "Interactive pizza map, carousel, albums, list, and shop",
    transport: "sse",
    category: "openai-apps",
    url: "http://localhost:8001/mcp",
    defaultEnabled: true,
    toolIds: ["pizza-map", "pizza-carousel", "pizza-albums", "pizza-list"],
  },
  {
    id: "kitchen-sink-node",
    name: "Kitchen Sink (Node)",
    description: "Showcases all OpenAI Apps SDK features",
    transport: "sse",
    category: "openai-apps",
    url: "http://localhost:8000/mcp",
    defaultEnabled: true,
    toolIds: ["kitchen-sink-show", "kitchen-sink-refresh"],
  },
  {
    id: "pizzaz-python",
    name: "Pizzaz (Python)",
    description: "Python implementation of pizza widgets",
    transport: "streamable-http",
    category: "openai-apps",
    url: "http://localhost:8002/mcp",
    defaultEnabled: false,
    toolIds: [
      "pizza-map",
      "pizza-carousel",
      "pizza-albums",
      "pizza-list",
      "pizza-shop",
    ],
  },
  {
    id: "kitchen-sink-python",
    name: "Kitchen Sink (Python)",
    description: "Python implementation of kitchen sink",
    transport: "streamable-http",
    category: "openai-apps",
    url: "http://localhost:8003/mcp",
    defaultEnabled: false,
    toolIds: ["kitchen-sink-show", "kitchen-sink-refresh"],
  },
  {
    id: "solar-system-python",
    name: "Solar System (Python)",
    description: "3D visualization of planets with realistic orbits",
    transport: "streamable-http",
    category: "openai-apps",
    url: "http://localhost:8004/mcp",
    defaultEnabled: false,
    toolIds: ["solar-system"],
  },
  {
    id: "shopping-cart-python",
    name: "Shopping Cart (Python)",
    description: "Cart management with items and checkout",
    transport: "streamable-http",
    category: "openai-apps",
    url: "http://localhost:8006/mcp",
    defaultEnabled: false,
    toolIds: ["shopping-cart"],
  },
];

export function getDefaultEnabledServers(): string[] {
  return MCP_SERVERS.filter((s) => s.defaultEnabled).map((s) => s.id);
}

export function getServerById(id: string): MCPServerConfig | undefined {
  return MCP_SERVERS.find((s) => s.id === id);
}

/** Get all tool IDs that should be enabled based on enabled server configs */
export function getEnabledToolIds(enabledServerIds: string[]): string[] {
  const toolIds = new Set<string>();
  for (const serverId of enabledServerIds) {
    const server = getServerById(serverId);
    if (server?.toolIds) {
      server.toolIds.forEach((id) => toolIds.add(id));
    }
  }
  return Array.from(toolIds);
}

/** Check if we need to connect to any widget server */
export function shouldConnectWidgetServer(enabledServerIds: string[]): boolean {
  return MCP_SERVERS.some(
    (s) => enabledServerIds.includes(s.id) && s.uiCapability,
  );
}
