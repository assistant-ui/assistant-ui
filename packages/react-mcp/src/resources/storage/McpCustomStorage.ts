import { resource } from "@assistant-ui/tap";
import type { MCPStorage } from "./types";

const useMcpCustomStorage = (impl: MCPStorage): MCPStorage => {
  return impl;
};

export const McpCustomStorage = resource(useMcpCustomStorage);
