import { resource } from "@assistant-ui/tap";
import type { MCPStorage } from "./types";

export const McpCustomStorage = resource(
  (impl: MCPStorage): MCPStorage => impl,
);
