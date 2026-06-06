import { resource } from "@assistant-ui/tap";
import type { MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPPersistedAuthState } from "../../auth/types";
import type { MCPStorage } from "./types";

export const McpMemoryStorage = resource(
  function McpMemoryStorage(): MCPStorage {
    let servers: MCPCustomServerRecord[] = [];
    const auth = new Map<string, MCPPersistedAuthState>();
    return {
      loadCustomServers: async () => [...servers],
      saveCustomServers: async (records) => {
        servers = [...records];
      },
      loadAuthState: async (id) => auth.get(id) ?? null,
      saveAuthState: async (id, state) => {
        auth.set(id, state);
      },
      clearAuthState: async (id) => {
        auth.delete(id);
      },
    };
  },
);
