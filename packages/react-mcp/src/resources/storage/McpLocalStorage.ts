import { resource } from "@assistant-ui/tap";
import { useMemo } from "react";
import type { MCPStorage } from "./types";
import {
  normalizeCustomServerRecords,
  normalizePersistedAuthState,
} from "./McpStoredDataNormalization";

export {
  normalizeCustomServerRecords,
  normalizePersistedAuthState,
} from "./McpStoredDataNormalization";

export type McpLocalStorageOptions = {
  /** Namespace prefix for keys. Default "aui-mcp". */
  keyPrefix?: string;
  /** Override the underlying Storage. Defaults to globalThis.localStorage. */
  storage?: Storage;
  /**
   * Stable identity for the backing data, used to key server reconnects.
   * Required to get reconnect-on-swap behavior when `storage` is overridden;
   * without it a custom backing store declares no scope, since a prefix
   * alone cannot distinguish two different stores.
   */
  scopeId?: string;
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

const useMcpLocalStorage = (opts: McpLocalStorageOptions = {}): MCPStorage => {
  const prefix = opts.keyPrefix ?? "aui-mcp";
  const storage = resolveStorage(opts);
  // Deriving a scope from the prefix is only honest for the shared
  // globalThis.localStorage; two custom backing stores under one prefix hold
  // different data, so an overridden backing declares no scope unless the
  // caller names one.
  const scopeId =
    opts.scopeId ??
    (opts.storage === undefined ? `local-storage:${prefix}` : undefined);

  // Callers key per-server coordination state on this instance, so it has to
  // stay referentially stable for as long as the underlying store does.
  return useMemo(() => {
    const customServersKey = `${prefix}:custom-servers`;
    const authKey = (id: string) => `${prefix}:auth:${id}`;

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
      ...(scopeId !== undefined ? { scopeId } : {}),
      loadCustomServers: async () =>
        normalizeCustomServerRecords(read<unknown>(customServersKey, [])),
      saveCustomServers: async (records) => {
        write(customServersKey, records);
      },
      loadAuthState: async (id) =>
        normalizePersistedAuthState(read<unknown>(authKey(id), null)),
      saveAuthState: async (id, state) => {
        write(authKey(id), state);
      },
      clearAuthState: async (id) => {
        remove(authKey(id));
      },
    };
  }, [prefix, storage, scopeId]);
};

export const McpLocalStorage = resource(useMcpLocalStorage);
