import { type ResourceElement } from "@assistant-ui/tap";
import type { MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPPersistedAuthState } from "../../auth/types";

export type MCPStorage = {
  /**
   * Stable identity of the backing store. Two storages with the same scopeId
   * must read and write the same persisted data. When present, custom servers,
   * server connections, and the OAuth write fence key on it. Swapping to a
   * differently-scoped storage rehydrates its custom servers and reconnects
   * authenticated servers instead of retaining data or a live OAuth flow from
   * the replaced store. Clearing through a same-scoped replacement still waits
   * for writes queued against the storage it replaced. When absent, the fence
   * falls back to object identity while custom servers and connections never
   * re-key. Replacing an unscoped storage can therefore persist the previous
   * store's custom servers into the replacement, and a clear runs unfenced
   * against writes queued by the object it replaced.
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
