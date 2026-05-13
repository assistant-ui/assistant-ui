import { useAui } from "@assistant-ui/store";
import type { MCPManagerMethods } from "../mcp-scope";

/**
 * Imperative accessor for the MCP manager. Equivalent to `useAui().mcp()`.
 */
export function useMcpManager(): MCPManagerMethods {
  return useAui().mcp();
}
