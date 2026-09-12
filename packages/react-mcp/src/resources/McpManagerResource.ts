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
import { useAssistantScopeEffect } from "@assistant-ui/store/client";
import { ModelContext } from "@assistant-ui/core/store";
import { createMcpId } from "../utils/createMcpId";
import { clearOAuthProviderAuthState } from "../auth/createOAuthProvider";
import type { Tool } from "assistant-stream";
import { McpServerResource } from "./McpServerResource";
import { withMcpServerRemovalFence } from "./McpServerRemovalFence";
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

const reportCustomStorageFailure = (
  operation: "load" | "save",
  error: unknown,
) => {
  console.error(
    `[assistant-ui/react-mcp] failed to ${operation} custom servers:`,
    error,
  );
};

const reportBlockedCustomServerPersistence = () => {
  console.error(
    "[assistant-ui/react-mcp] custom server changes remain in memory because loading the persisted list failed; remount the manager to retry",
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

type CustomServerPersistenceQueues = Map<string, Promise<void>>;

const enqueueCustomServerTask = (
  persistenceQueues: CustomServerPersistenceQueues,
  scopeKey: string,
  task: () => Promise<void>,
) => {
  const previous = persistenceQueues.get(scopeKey);
  const next = (previous ?? Promise.resolve()).then(task);
  persistenceQueues.set(scopeKey, next);
  void next.then(() => {
    if (persistenceQueues.get(scopeKey) === next) {
      persistenceQueues.delete(scopeKey);
    }
  });
};

const enqueueCustomServerPersistence = (
  persistenceQueues: CustomServerPersistenceQueues,
  scopeKey: string,
  storage: MCPStorage,
  records: MCPCustomServerRecord[],
) =>
  enqueueCustomServerTask(persistenceQueues, scopeKey, () =>
    persistCustomServers(storage, records),
  );

const holdCustomServerPersistence = (
  persistenceQueues: CustomServerPersistenceQueues,
  scopeKey: string,
) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  enqueueCustomServerTask(persistenceQueues, scopeKey, () => gate);
  return release;
};

type McpCustomServersResourceProps = {
  storage: MCPStorage;
  scopeKey: string;
  persistenceQueues: CustomServerPersistenceQueues;
};

const useMcpCustomServersResource = ({
  storage,
  scopeKey,
  persistenceQueues,
}: McpCustomServersResourceProps) => {
  const [customServers, setCustomServers] = useState<MCPCustomServerRecord[]>(
    [],
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const customServersRef = useRef<MCPCustomServerRecord[]>([]);
  const hydrationStateRef = useRef<"pending" | "succeeded" | "failed">(
    "pending",
  );
  const hasPendingMutationRef = useRef(false);
  const reportedBlockedPersistenceRef = useRef(false);

  const hydrate = useEffectEvent(async (signal: { cancelled: boolean }) => {
    // A revisited scope must not read behind writes still queued against it.
    while (true) {
      const pendingPersistence = persistenceQueues.get(scopeKey);
      if (!pendingPersistence) break;
      await pendingPersistence;
      if (signal.cancelled) return;
      if (persistenceQueues.get(scopeKey) === pendingPersistence) break;
    }

    let records: Awaited<ReturnType<typeof storage.loadCustomServers>>;
    try {
      records = await storage.loadCustomServers();
    } catch (error) {
      if (!signal.cancelled) {
        reportCustomStorageFailure("load", error);
        hydrationStateRef.current = "failed";
        if (hasPendingMutationRef.current) {
          reportBlockedCustomServerPersistence();
          reportedBlockedPersistenceRef.current = true;
        }
        setIsHydrated(true);
      }
      return;
    }

    // Merge rather than replace so any addCustomServer calls that
    // happened before hydration resolved aren't silently overwritten.
    // Persisted order wins; pre-hydration locals append.
    const hadPendingMutation = hasPendingMutationRef.current;
    const mergedRecords = (() => {
      const prev = customServersRef.current;
      if (prev.length === 0) return records;
      const persistedIds = new Set(records.map((r) => r.id));
      return [...records, ...prev.filter((r) => !persistedIds.has(r.id))];
    })();
    customServersRef.current = mergedRecords;
    hydrationStateRef.current = "succeeded";
    hasPendingMutationRef.current = false;
    if (hadPendingMutation) {
      enqueueCustomServerPersistence(
        persistenceQueues,
        scopeKey,
        storage,
        mergedRecords,
      );
    }
    if (signal.cancelled) return;
    setCustomServers(mergedRecords);
    setIsHydrated(true);
  });

  useEffect(() => {
    const signal = { cancelled: false };
    // Hydration reads persisted records asynchronously; there is no earlier
    // point than mount at which to start it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void hydrate(signal);
    return () => {
      signal.cancelled = true;
    };
  }, []);

  const updateCustomServers = useCallback(
    (
      updater: (records: MCPCustomServerRecord[]) => MCPCustomServerRecord[],
    ) => {
      const next = updater(customServersRef.current);
      customServersRef.current = next;
      setCustomServers(next);

      if (hydrationStateRef.current === "succeeded") {
        enqueueCustomServerPersistence(
          persistenceQueues,
          scopeKey,
          storage,
          next,
        );
        return;
      }

      hasPendingMutationRef.current = true;
      if (
        hydrationStateRef.current === "failed" &&
        !reportedBlockedPersistenceRef.current
      ) {
        reportBlockedCustomServerPersistence();
        reportedBlockedPersistenceRef.current = true;
      }
    },
    [persistenceQueues, scopeKey, storage],
  );

  return { customServers, isHydrated, updateCustomServers };
};

const McpCustomServersResource = resource(useMcpCustomServersResource);

const useMcpManagerResource = (
  props: McpManagerResourceProps,
): ClientOutput<"mcp"> => {
  const connectors = props.connectors ?? NO_CONNECTORS;
  const autoConnect = props.autoConnect ?? true;
  const redirectUri = props.oauthRedirectUri ?? defaultRedirectUri();
  const connectionTimeout = props.connectionTimeout;

  const storageElement = props.storage ?? McpLocalStorage();
  const storage = useResource(storageElement);
  const [persistenceQueues] = useState<CustomServerPersistenceQueues>(
    () => new Map(),
  );
  const storageScopeKey =
    storage.scopeId === undefined ? "unscoped" : `scoped:${storage.scopeId}`;
  const { customServers, isHydrated, updateCustomServers } = useResource(
    withKey(
      storageScopeKey,
      McpCustomServersResource({
        storage,
        scopeKey: storageScopeKey,
        persistenceQueues,
      }),
    ),
  );

  const serverElements = useMemo(() => {
    assertUniqueServerIds([
      ...connectors.map((c) => c.id),
      ...customServers.map((s) => s.id),
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
    const customElements = customServers.map((s) =>
      withKey(
        s.id,
        McpServerResource(
          withMcpServerRemovalFence(
            {
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
            },
            () =>
              holdCustomServerPersistence(persistenceQueues, storageScopeKey),
          ),
        ),
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
    updateCustomServers,
    persistenceQueues,
    storageScopeKey,
  ]);

  const lookup = useClientLookup(serverElements);

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
            lookup.get({ key: server.id }).callTool(tool.name, args as unknown),
        };
      }
    }
    return out;
  }, [state, lookup]);

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
    return lookup.get({ key: entry.id });
  };

  return {
    getState: () => state,
    server: (query) => {
      if ("id" in query) return lookup.get({ key: query.id });
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
        await lookup.get({ key: id }).remove();
      } catch {
        const releasePersistence = holdCustomServerPersistence(
          persistenceQueues,
          storageScopeKey,
        );
        try {
          await clearOAuthProviderAuthState(storage, id);
          updateCustomServers((prev) =>
            prev.filter((record) => record.id !== id),
          );
        } catch (error) {
          releasePersistence();
          throw error;
        }
        releasePersistence();
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
