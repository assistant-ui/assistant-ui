import {
  useState,
  useEffect,
  useMemo,
  useEffectEvent,
  useRef,
  useCallback,
} from "react";
import { useResource, resource, withKey } from "@assistant-ui/tap";
import {
  useClientLookup,
  useAssistantClientRef,
  attachTransformScopes,
  type ClientOutput,
} from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
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
  /** Changes when the custom storage account, tenant, or workspace changes. */
  storageScopeKey?: string | number | undefined;
};

function defaultRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/mcp/callback`;
}

// Stable empty fallback so an absent `connectors` prop doesn't produce a fresh
// array each render (which would invalidate the serverElements memo below).
const NO_CONNECTORS: MCPConnector[] = [];
const NO_CUSTOM_SERVERS: MCPCustomServerRecord[] = [];

type StorageScope = {
  hook: MCPStorageElement["hook"];
  key: MCPStorageElement["key"];
  storageScopeKey: McpManagerResourceProps["storageScopeKey"];
};

type CustomServerState = {
  storageScope: StorageScope;
  records: MCPCustomServerRecord[];
  isHydrated: boolean;
  persistenceRevision: number;
};

type StoragePersistenceQueueRegistry = WeakMap<
  MCPStorageElement["hook"],
  Map<
    MCPStorageElement["key"],
    Map<McpManagerResourceProps["storageScopeKey"], Promise<void>>
  >
>;

const getStoragePersistenceQueue = (
  registry: StoragePersistenceQueueRegistry,
  storageHook: MCPStorageElement["hook"],
  storageElementKey: MCPStorageElement["key"],
) => {
  let queuesByElementKey = registry.get(storageHook);
  if (!queuesByElementKey) {
    queuesByElementKey = new Map();
    registry.set(storageHook, queuesByElementKey);
  }

  let queuesByExplicitKey = queuesByElementKey.get(storageElementKey);
  if (!queuesByExplicitKey) {
    queuesByExplicitKey = new Map();
    queuesByElementKey.set(storageElementKey, queuesByExplicitKey);
  }

  return queuesByExplicitKey;
};

const storageScopeResourceKeys = new WeakMap<object, number>();
let nextStorageScopeResourceKey = 0;

const getStorageScopeResourceKey = (storageScope: object) => {
  const existing = storageScopeResourceKeys.get(storageScope);
  if (existing !== undefined) return existing;

  const key = nextStorageScopeResourceKey++;
  storageScopeResourceKeys.set(storageScope, key);
  return key;
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
  const storageScopeKey = props.storageScopeKey;

  const storageElement = props.storage ?? McpLocalStorage();
  const storageHook = storageElement.hook;
  const storageElementKey = storageElement.key;
  const storage = useResource(storageElement);

  // Tap resource identity excludes args because they may be recreated inline.
  const storageScope = useMemo(
    () => ({
      hook: storageHook,
      key: storageElementKey,
      storageScopeKey,
    }),
    [storageHook, storageElementKey, storageScopeKey],
  );
  const serverResourceKeyPrefix = `${getStorageScopeResourceKey(storageScope)}:`;
  const [customServerState, setCustomServerState] = useState<CustomServerState>(
    () => ({
      storageScope,
      records: [],
      isHydrated: false,
      persistenceRevision: 0,
    }),
  );
  const isCurrentStorage = customServerState.storageScope === storageScope;
  const customServers = isCurrentStorage
    ? customServerState.records
    : NO_CUSTOM_SERVERS;
  const isHydrated = isCurrentStorage && customServerState.isHydrated;
  const persistenceRevision = isCurrentStorage
    ? customServerState.persistenceRevision
    : 0;

  const storageRef = useRef(storage);
  const persistenceQueuesRef = useRef<StoragePersistenceQueueRegistry>(
    new WeakMap(),
  );

  useEffect(() => {
    storageRef.current = storage;
  }, [storage]);

  const hydrate = useEffectEvent(
    async (
      signal: { cancelled: boolean },
      targetScope: StorageScope,
      targetStorage: MCPStorage,
      queueRegistry: StoragePersistenceQueueRegistry,
      targetStorageHook: MCPStorageElement["hook"],
      targetStorageElementKey: MCPStorageElement["key"],
      targetStorageScopeKey: McpManagerResourceProps["storageScopeKey"],
    ) => {
      const finishHydration = (records?: MCPCustomServerRecord[]) => {
        if (signal.cancelled) return;
        setCustomServerState((prev) => {
          if (prev.storageScope !== targetScope) return prev;
          if (!records) return { ...prev, isHydrated: true };

          const persistedIds = new Set(records.map((record) => record.id));
          const unpersistedRecords = prev.records.filter(
            (record) => !persistedIds.has(record.id),
          );
          return {
            storageScope: targetScope,
            records: [...records, ...unpersistedRecords],
            isHydrated: true,
            persistenceRevision:
              unpersistedRecords.length > 0 ? prev.persistenceRevision : 0,
          };
        });
      };

      const pendingPersistence = queueRegistry
        .get(targetStorageHook)
        ?.get(targetStorageElementKey)
        ?.get(targetStorageScopeKey);
      if (pendingPersistence) await pendingPersistence;
      if (signal.cancelled) return;

      let records: Awaited<ReturnType<typeof targetStorage.loadCustomServers>>;
      try {
        records = await targetStorage.loadCustomServers();
      } catch (error) {
        if (!signal.cancelled) {
          reportCustomStorageFailure("load", error);
        }
        finishHydration();
        return;
      }

      finishHydration(records);
    },
  );

  const updateCustomServers = useCallback(
    (
      updater: (records: MCPCustomServerRecord[]) => MCPCustomServerRecord[],
    ) => {
      setCustomServerState((prev) => {
        if (prev.storageScope !== storageScope) return prev;
        return {
          storageScope,
          records: updater(prev.records),
          isHydrated: prev.isHydrated,
          persistenceRevision: prev.persistenceRevision + 1,
        };
      });
    },
    [storageScope],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    setCustomServerState((prev) => {
      if (prev.storageScope === storageScope && !prev.isHydrated) return prev;
      return {
        storageScope,
        records: [],
        isHydrated: false,
        persistenceRevision: 0,
      };
    });
    void hydrate(
      signal,
      storageScope,
      storageRef.current,
      persistenceQueuesRef.current,
      storageScope.hook,
      storageScope.key,
      storageScope.storageScopeKey,
    );
    return () => {
      signal.cancelled = true;
    };
  }, [storageScope]);

  useEffect(() => {
    if (!isHydrated || persistenceRevision === 0) return;
    const targetStorage = storageRef.current;
    const queueRegistry = persistenceQueuesRef.current;
    const queues = getStoragePersistenceQueue(
      queueRegistry,
      storageHook,
      storageElementKey,
    );
    const previous = queues.get(storageScopeKey);
    const next = (previous ?? Promise.resolve()).then(() =>
      persistCustomServers(targetStorage, customServers),
    );
    queues.set(storageScopeKey, next);
    void next.then(() => {
      if (queues.get(storageScopeKey) !== next) return;
      queues.delete(storageScopeKey);

      const queuesByElementKey = queueRegistry.get(storageHook);
      if (queues.size === 0) queuesByElementKey?.delete(storageElementKey);
      if (queuesByElementKey?.size === 0) queueRegistry.delete(storageHook);
    });
  }, [
    customServers,
    isHydrated,
    persistenceRevision,
    storageElementKey,
    storageHook,
    storageScopeKey,
  ]);

  const serverElements = useMemo(() => {
    assertUniqueServerIds([
      ...connectors.map((c) => c.id),
      ...customServers.map((s) => s.id),
    ]);

    const connectorElements = connectors.map((c) =>
      withKey(
        `${serverResourceKeyPrefix}${c.id}`,
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
    const customElements = customServers.map((s) =>
      withKey(
        `${serverResourceKeyPrefix}${s.id}`,
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
            updateCustomServers((prev) =>
              prev.filter((record) => record.id !== s.id),
            );
          },
        }),
      ),
    );
    return [...connectorElements, ...customElements];
  }, [
    connectors,
    customServers,
    storage,
    redirectUri,
    autoConnect,
    connectionTimeout,
    serverResourceKeyPrefix,
    updateCustomServers,
  ]);

  const lookup = useClientLookup(serverElements);

  const getServerById = useCallback(
    (id: string) => lookup.get({ key: `${serverResourceKeyPrefix}${id}` }),
    [lookup, serverResourceKeyPrefix],
  );

  const state = useMemo<MCPManagerState>(() => {
    const all = lookup.state;
    return {
      servers: all,
      connectors: all.filter((s) => s.kind === "connector"),
      customServers: all.filter((s) => s.kind === "custom"),
      isHydrated,
    };
  }, [lookup.state, isHydrated]);

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
        out[fullName] = {
          type: "frontend",
          ...(tool.description !== undefined
            ? { description: tool.description }
            : {}),
          parameters: tool.inputSchema as never,
          execute: (args) =>
            getServerById(server.id).callTool(tool.name, args as unknown),
        };
      }
    }
    return out;
  }, [state, getServerById]);

  const clientRef = useAssistantClientRef();

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    return client.modelContext.register({
      getModelContext: () => ({ tools: toolkit }),
    });
  }, [toolkit, clientRef]);

  const serverByKind = (kind: "connector" | "custom", index: number) => {
    const list = kind === "connector" ? state.connectors : state.customServers;
    const entry = list[index];
    if (!entry) {
      throw new Error(
        `McpManagerResource: no ${kind} at index ${index} (length ${list.length})`,
      );
    }
    return getServerById(entry.id);
  };

  return {
    getState: () => state,
    server: (query) => {
      if ("id" in query) return getServerById(query.id);
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
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        url,
        auth: auth as MCPAuthConfig,
        connectionTimeout,
        ...(cache !== undefined ? { cache } : {}),
        ...(elicitation !== undefined ? { elicitation } : {}),
        createdAt: Date.now(),
      };
      updateCustomServers((prev) => [...prev, record]);
      return record.id;
    },
    removeServer: async (id) => {
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
        await getServerById(id).remove();
      } catch {
        await storage.clearAuthState(id);
        updateCustomServers((prev) =>
          prev.filter((record) => record.id !== id),
        );
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
