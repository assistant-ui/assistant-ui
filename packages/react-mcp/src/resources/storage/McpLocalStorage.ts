import { resource } from "@assistant-ui/tap";
import type { MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPPersistedAuthState } from "../../auth/types";
import type { MCPStorage } from "./types";

export type McpLocalStorageOptions = {
  /** Namespace prefix for keys. Default "aui-mcp". */
  keyPrefix?: string;
  /** Override the underlying Storage. Defaults to globalThis.localStorage. */
  storage?: Storage;
};

function resolveStorage(opts: McpLocalStorageOptions): Storage | null {
  if (opts.storage) return opts.storage;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    try {
      return (globalThis as { localStorage: Storage }).localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

export const McpLocalStorage = resource(function McpLocalStorage(
  opts: McpLocalStorageOptions = {},
): MCPStorage {
  const prefix = opts.keyPrefix ?? "aui-mcp";
  const customServersKey = `${prefix}:custom-servers`;
  const authKey = (id: string) => `${prefix}:auth:${id}`;
  const storage = resolveStorage(opts);

  const read = <T>(key: string, fallback: T): T => {
    if (!storage) return fallback;
    try {
      const raw = storage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const write = (key: string, value: unknown): void => {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // quota or serialization failure — silently drop
    }
  };

  const remove = (key: string): void => {
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return {
    loadCustomServers: async () =>
      read<MCPCustomServerRecord[]>(customServersKey, []),
    saveCustomServers: async (records) => {
      write(customServersKey, records);
    },
    loadAuthState: async (id) =>
      read<MCPPersistedAuthState | null>(authKey(id), null),
    saveAuthState: async (id, state) => {
      write(authKey(id), state);
    },
    clearAuthState: async (id) => {
      remove(authKey(id));
    },
  };
});
