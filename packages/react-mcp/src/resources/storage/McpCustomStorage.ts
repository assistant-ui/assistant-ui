import { resource } from "@assistant-ui/tap";
import type { MCPStorage } from "./types";

export const McpCustomStorage = resource(function McpCustomStorage(
  impl: MCPStorage,
): MCPStorage {
  return impl;
});
