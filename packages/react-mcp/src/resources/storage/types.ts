import { type ResourceElement } from "@assistant-ui/tap";
import type { MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPPersistedAuthState } from "../../auth/types";

export type MCPStorage = {
  /**
   * Stable identity of the backing store. Two storages with the same scopeId
   * must read and write the same persisted data. When present, server
   * connections key on it, so swapping to a differently-scoped storage
   * reconnects instead of leaving a live OAuth flow on the replaced store;
   * when absent, storage swaps never key a reconnect.
   */
  scopeId?: string;
  loadCustomServers: () => Promise<MCPCustomServerRecord[]>;
  saveCustomServers: (records: MCPCustomServerRecord[]) => Promise<void>;
  loadAuthState: (serverId: string) => Promise<MCPPersistedAuthState | null>;
  saveAuthState: (
    serverId: string,
    state: MCPPersistedAuthState,
  ) => Promise<void>;
  clearAuthState: (serverId: string) => Promise<void>;
};

export type MCPStorageElement = ResourceElement<MCPStorage>;
