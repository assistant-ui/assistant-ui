import { type ResourceElement } from "@assistant-ui/tap";
import type { MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPPersistedAuthState } from "../../auth/types";

export type MCPStorage = {
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
