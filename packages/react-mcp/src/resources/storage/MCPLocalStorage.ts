import { resource } from "@assistant-ui/tap";
import type { MCPCustomServerRecord } from "../../mcp-scope";
import type { MCPPersistedAuthState } from "../../auth/types";
import type { MCPStorage } from "./types";

export type MCPLocalStorageOptions = {
  /** Namespace prefix for keys. Default "aui-mcp". */
  keyPrefix?: string;
  /** Override the underlying Storage. Defaults to globalThis.localStorage. */
  storage?: Storage;
};

function getStorage(opts: MCPLocalStorageOptions): Storage | null {
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

export const MCPLocalStorage = resource(
  (opts: MCPLocalStorageOptions = {}): MCPStorage => {
    const prefix = opts.keyPrefix ?? "aui-mcp";
    const customServersKey = `${prefix}:custom-servers`;
    const authKey = (id: string) => `${prefix}:auth:${id}`;

    const read = <T>(key: string, fallback: T): T => {
      const s = getStorage(opts);
      if (!s) return fallback;
      try {
        const raw = s.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    };

    const write = (key: string, value: unknown): void => {
      const s = getStorage(opts);
      if (!s) return;
      try {
        s.setItem(key, JSON.stringify(value));
      } catch {
        // quota or serialization failure — silently drop
      }
    };

    const remove = (key: string): void => {
      const s = getStorage(opts);
      if (!s) return;
      try {
        s.removeItem(key);
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
  },
);
