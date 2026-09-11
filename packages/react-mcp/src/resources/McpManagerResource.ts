import { useState, useEffect, useMemo, useEffectEvent, useRef } from "react";
import { useResource, resource, withKey } from "@assistant-ui/tap";
import {
  useClientLookup,
  useAssistantClientRef,
  attachTransformScopes,
  type ClientOutput,
} from "@assistant-ui/store";
import { useAssistantScopeEffect } from "@assistant-ui/store/client";
import { ModelContext } from "@assistant-ui/core/store";
import { createMcpId } from "../utils/createMcpId";
import { clearOAuthProviderAuthState } from "../auth/createOAuthProvider";
import type { Tool } from "assistant-stream";
import { McpServerResource } from "./McpServerResource";
import { McpLocalStorage } from "./storage/McpLocalStorage";
import type { MCPStorage, MCPStorageElement } from "./storage/types";
import { assertUniqueServerIds } from "../utils/serverId";
import type {
  MCPAuthConfig,
  MCPConnector,
  MCPCustomServerRecord,
  MCPManagerState,
} from "../mcp-scope";

export type McpManagerResourceProps = {
  connectors?: MCPConnector[] | undefined;
  storage?: MCPStorageElement | undefined;
  /** OAuth redirect target. Defaults to `${origin}/mcp/callback`. */
  oauthRedirectUri?: string | undefined;
  /** Connect on mount when usable auth exists. Default true. */
  autoConnect?: boolean | undefined;
  /** Optional timeout in milliseconds for connect/listTools calls. Disabled by default. */
  connectionTimeout?: number | undefined;
};

function defaultRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/mcp/callback`;
}

// Stable empty fallback so an absent `connectors` prop doesn't produce a fresh
// array each render (which would invalidate the serverElements memo below).
const NO_CONNECTORS: MCPConnector[] = [];
const NO_CUSTOM_SERVERS: MCPCustomServerRecord[] = [];
const UNDECLARED_SCOPE = Symbol("undeclared-mcp-storage-scope");
const INTERNAL_KEY_SEPARATOR = "\x1f";

type StorageScopeKey = string | typeof UNDECLARED_SCOPE;
type PersistenceQueueKey = string | MCPStorage;

const getStorageScopeKey = (storage: MCPStorage): StorageScopeKey =>
  storage.scopeId ?? UNDECLARED_SCOPE;

const getPersistenceQueueKey = (storage: MCPStorage): PersistenceQueueKey =>
  storage.scopeId ?? storage;

const getCustomServerLookupKey = (
  scopeKey: StorageScopeKey,
  id: string,
): string => {
  if (scopeKey === UNDECLARED_SCOPE) return id;
  return `custom${INTERNAL_KEY_SEPARATOR}${scopeKey}${INTERNAL_KEY_SEPARATOR}${id}`;
};

const reportCustomStorageFailure = (
  operation: "load" | "save",
  error: unknown,
) => {
  console.error(
    `[assistant-ui/react-mcp] failed to ${operation} custom servers:`,
    error,
  );
};

const persistCustomServers = async (
  storage: MCPStorage,
  records: MCPCustomServerRecord[],
) => {
  try {
    await storage.saveCustomServers(records);
  } catch (error) {
    reportCustomStorageFailure("save", error);
  }
};

const useMcpManagerResource = (
  props: McpManagerResourceProps,
): ClientOutput<"mcp"> => {
  const connectors = props.connectors ?? NO_CONNECTORS;
  const autoConnect = props.autoConnect ?? true;
  const redirectUri = props.oauthRedirectUri ?? defaultRedirectUri();
  const connectionTimeout = props.connectionTimeout;

  const storageElement = props.storage ?? McpLocalStorage();
  const storage = useResource(storageElement);

  const scopeKey = getStorageScopeKey(storage);
  const scopeStateRef = useRef({
    key: scopeKey,
    generation: 0,
  });
  const scopeChanged = scopeStateRef.current.key !== scopeKey;
  if (scopeChanged) {
    scopeStateRef.current = {
      key: scopeKey,
      generation: scopeStateRef.current.generation + 1,
    };
  }
  const scopeGeneration = scopeStateRef.current.generation;

  const [customServersByScope, setCustomServersByScope] = useState<
    Map<StorageScopeKey, MCPCustomServerRecord[]>
  >(() => new Map());
  const [isHydrated, setIsHydrated] = useState(false);

  const hydratedRef = useRef(false);
  const persistenceQueuesRef = useRef(
    new Map<PersistenceQueueKey, Promise<void>>(),
  );

  const isCurrentScope = (
    targetScopeKey: StorageScopeKey,
    generation: number,
  ) =>
    scopeStateRef.current.key === targetScopeKey &&
    scopeStateRef.current.generation === generation;

  const enqueuePersistence = useEffectEvent(
    (targetStorage: MCPStorage, records: MCPCustomServerRecord[]) => {
      const queueKey = getPersistenceQueueKey(targetStorage);
      const previous =
        persistenceQueuesRef.current.get(queueKey) ?? Promise.resolve();
      const next = previous.then(() =>
        persistCustomServers(targetStorage, [...records]),
      );
      persistenceQueuesRef.current.set(queueKey, next);
    },
  );

  const hydrate = useEffectEvent(
    async (
      targetStorage: MCPStorage,
      targetScopeKey: StorageScopeKey,
      generation: number,
    ) => {
      const pendingPersistence = persistenceQueuesRef.current.get(
        getPersistenceQueueKey(targetStorage),
      );
      if (pendingPersistence) await pendingPersistence;
      if (!isCurrentScope(targetScopeKey, generation)) return;

      let records: Awaited<ReturnType<typeof targetStorage.loadCustomServers>>;
      try {
        records = await targetStorage.loadCustomServers();
      } catch (error) {
        if (isCurrentScope(targetScopeKey, generation)) {
          reportCustomStorageFailure("load", error);
          hydratedRef.current = true;
          setIsHydrated(true);
        }
        return;
      }

      if (!isCurrentScope(targetScopeKey, generation)) return;
      setCustomServersByScope((current) => {
        if (!isCurrentScope(targetScopeKey, generation)) return current;
        const previous = current.get(targetScopeKey) ?? [];
        const persistedIds = new Set(records.map((record) => record.id));
        const merged =
          previous.length === 0
            ? records
            : [
                ...records,
                ...previous.filter((record) => !persistedIds.has(record.id)),
              ];
        const next = new Map(current);
        next.set(targetScopeKey, merged);
        return next;
      });
      if (!isCurrentScope(targetScopeKey, generation)) return;
      hydratedRef.current = true;
      setIsHydrated(true);
    },
  );

  useEffect(() => {
    hydratedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomServersByScope((current) => {
      if (!current.has(scopeKey)) return current;
      const next = new Map(current);
      next.delete(scopeKey);
      return next;
    });
    setIsHydrated(false);
    void hydrate(storage, scopeKey, scopeGeneration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  const currentCustomServers = scopeChanged
    ? NO_CUSTOM_SERVERS
    : (customServersByScope.get(scopeKey) ?? NO_CUSTOM_SERVERS);

  useEffect(() => {
    if (!hydratedRef.current || scopeChanged) return;
    if (!isCurrentScope(scopeKey, scopeGeneration)) return;
    enqueuePersistence(storage, currentCustomServers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customServersByScope, scopeKey]);

  const serverElements = useMemo(() => {
    assertUniqueServerIds([
      ...connectors.map((c) => c.id),
      ...currentCustomServers.map((s) => s.id),
    ]);

    const connectorElements = connectors.map((c) =>
      withKey(
        c.id,
        McpServerResource({
          id: c.id,
          kind: "connector",
          name: c.name,
          url: c.url,
          icon: c.icon,
          auth: c.auth,
          storage,
          redirectUri,
          autoConnect,
          connectionTimeout: c.connectionTimeout ?? connectionTimeout,
          ...(c.cache !== undefined ? { cache: c.cache } : {}),
          ...(c.elicitation !== undefined
            ? { elicitation: c.elicitation }
            : {}),
          onRemove: async () => {
            // connectors cannot be removed
          },
        }),
      ),
    );
    const customElements = currentCustomServers.map((s) =>
      withKey(
        getCustomServerLookupKey(scopeKey, s.id),
        McpServerResource({
          id: s.id,
          kind: "custom",
          name: s.name,
          url: s.url,
          auth: s.auth,
          storage,
          redirectUri,
          autoConnect,
          connectionTimeout: s.connectionTimeout ?? connectionTimeout,
          ...(s.cache !== undefined ? { cache: s.cache } : {}),
          ...(s.elicitation !== undefined
            ? { elicitation: s.elicitation }
            : {}),
          onRemove: async () => {
            if (!isCurrentScope(scopeKey, scopeGeneration)) return;
            setCustomServersByScope((current) => {
              if (!isCurrentScope(scopeKey, scopeGeneration)) return current;
              const next = new Map(current);
              next.set(
                scopeKey,
                (current.get(scopeKey) ?? []).filter((x) => x.id !== s.id),
              );
              return next;
            });
          },
        }),
      ),
    );
    return [...connectorElements, ...customElements];
  }, [
    connectors,
    currentCustomServers,
    storage,
    scopeKey,
    scopeGeneration,
    redirectUri,
    autoConnect,
    connectionTimeout,
  ]);

  const lookup = useClientLookup(serverElements);

  const state = useMemo<MCPManagerState>(() => {
    const all = lookup.state;
    return {
      servers: all,
      connectors: all.filter((s) => s.kind === "connector"),
      customServers: all.filter((s) => s.kind === "custom"),
      isHydrated: scopeChanged ? false : isHydrated,
    };
  }, [lookup.state, isHydrated, scopeChanged]);

  const getLookupKey = (id: string) =>
    currentCustomServers.some((server) => server.id === id)
      ? getCustomServerLookupKey(scopeKey, id)
      : id;

  // ─── Auto-register MCP tools as frontend tools in modelContext ─────
  // Build the toolkit from connected servers; re-register when the visible
  // tool surface changes. Tool names are prefixed with the server id to
  // avoid collisions across connected servers — connector ids must not
  // contain `__` (enforced by `defineConnector`); `addCustomServer`
  // generates UUIDs that satisfy the constraint by construction.
  const toolkit = useMemo<Record<string, Tool<any, any>>>(() => {
    const out: Record<string, Tool<any, any>> = {};
    for (const server of state.servers) {
      if (server.connectionState !== "connected") continue;
      for (const tool of server.tools) {
        const fullName = `${server.id}__${tool.name}`;
        const lookupKey =
          server.kind === "custom"
            ? getCustomServerLookupKey(scopeKey, server.id)
            : server.id;
        out[fullName] = {
          type: "frontend",
          ...(tool.description !== undefined
            ? { description: tool.description }
            : {}),
          parameters: tool.inputSchema as never,
          execute: (args) =>
            lookup.get({ key: lookupKey }).callTool(tool.name, args as unknown),
        };
      }
    }
    return out;
  }, [state, lookup, scopeKey]);

  const clientRef = useAssistantClientRef();

  useAssistantScopeEffect(
    "modelContext",
    () => {
      const client = clientRef.current;
      if (!client) return;
      return client.modelContext.register({
        getModelContext: () => ({ tools: toolkit }),
      });
    },
    [toolkit],
  );

  const serverByKind = (kind: "connector" | "custom", index: number) => {
    const list = kind === "connector" ? state.connectors : state.customServers;
    const entry = list[index];
    if (!entry) {
      throw new Error(
        `McpManagerResource: no ${kind} at index ${index} (length ${list.length})`,
      );
    }
    return lookup.get({ key: getLookupKey(entry.id) });
  };

  return {
    getState: () => state,
    server: (query) => {
      if ("id" in query) return lookup.get({ key: getLookupKey(query.id) });
      return serverByKind(query.kind, query.index);
    },
    connector: ({ index }) => serverByKind("connector", index),
    customServer: ({ index }) => serverByKind("custom", index),
    addCustomServer: async ({
      name,
      url,
      auth,
      connectionTimeout,
      cache,
      elicitation,
    }) => {
      const record: MCPCustomServerRecord = {
        id: createMcpId(),
        name,
        url,
        auth: auth as MCPAuthConfig,
        connectionTimeout,
        ...(cache !== undefined ? { cache } : {}),
        ...(elicitation !== undefined ? { elicitation } : {}),
        createdAt: Date.now(),
      };
      if (!isCurrentScope(scopeKey, scopeGeneration)) return record.id;
      setCustomServersByScope((current) => {
        if (!isCurrentScope(scopeKey, scopeGeneration)) return current;
        const next = new Map(current);
        next.set(scopeKey, [...(current.get(scopeKey) ?? []), record]);
        return next;
      });
      return record.id;
    },
    removeServer: async (id) => {
      if (!isCurrentScope(scopeKey, scopeGeneration)) return;
      // removeServer is custom-server only — connectors are app-defined
      // and not user-removable. Refuse rather than silently no-op.
      if (state.connectors.some((c) => c.id === id)) {
        throw new Error(
          `Cannot remove connector "${id}" — connectors are app-defined and not removable. Use a custom server id instead.`,
        );
      }
      // Delegate to McpServerResource.remove() which disconnects,
      // clears auth state, and unregisters from customServers in one
      // place. Fallback to manual cleanup if the lookup is empty
      // (server already gone).
      try {
        await lookup.get({ key: getLookupKey(id) }).remove();
      } catch {
        if (!isCurrentScope(scopeKey, scopeGeneration)) return;
        await clearOAuthProviderAuthState(storage, id);
        setCustomServersByScope((current) => {
          if (!isCurrentScope(scopeKey, scopeGeneration)) return current;
          const next = new Map(current);
          next.set(
            scopeKey,
            (current.get(scopeKey) ?? []).filter((s) => s.id !== id),
          );
          return next;
        });
      }
    },
  };
};

export const McpManagerResource = resource(useMcpManagerResource);

// Ensure modelContext exists as a sibling when the manager mounts. If an
// ancestor (e.g. a chat runtime) already provides modelContext, this is a
// no-op; otherwise it's auto-mounted alongside `mcp`.
attachTransformScopes(useMcpManagerResource, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
