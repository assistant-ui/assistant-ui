import { type ResourceElement } from "@assistant-ui/tap";
import type { MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPPersistedAuthState } from "../../auth/types";

export type MCPStorage = {
  /**
   * Stable identity of the backing store. Two storages with the same scopeId
   * must read and write the same persisted data. When present, server
   * connections and the OAuth write fence key on it, so swapping to a
   * differently-scoped storage reconnects instead of leaving a live OAuth flow
   * on the replaced store, and clearing through a same-scoped replacement still
   * waits for writes queued against the storage it replaced. When absent, the
   * fence falls back to object identity while connections never re-key at all,
   * so a storage rebuilt on every render has to declare a scopeId; without one
   * a clear runs unfenced against the writes queued by the object it replaced.
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
