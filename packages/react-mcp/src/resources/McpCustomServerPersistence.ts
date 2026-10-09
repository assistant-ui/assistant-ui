import {
  useState,
  useEffect,
  useEffectEvent,
  useRef,
  useCallback,
} from "react";
import { resource } from "@assistant-ui/tap";
import type { MCPCustomServerRecord } from "../mcp-scope";
import type { MCPStorage } from "./storage/types";

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

export type CustomServerPersistenceQueues = Map<string, Promise<void>>;

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

export const holdCustomServerPersistence = (
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

const deduplicateCustomServers = (records: MCPCustomServerRecord[]) => {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (seen.has(record.id)) {
      console.error(
        `[assistant-ui/react-mcp] ignored duplicate custom server id "${record.id}" loaded from storage`,
      );
      return false;
    }
    seen.add(record.id);
    return true;
  });
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
  const [removedBeforeHydration] = useState(() => new Set<string>());
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
      const loadedRecords = await storage.loadCustomServers();
      records = deduplicateCustomServers(loadedRecords);
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
    const hydratedRecords = records.filter(
      (record) => !removedBeforeHydration.has(record.id),
    );
    const mergedRecords = (() => {
      const prev = customServersRef.current;
      if (prev.length === 0) return hydratedRecords;
      const persistedIds = new Set(hydratedRecords.map((r) => r.id));
      return [
        ...hydratedRecords,
        ...prev.filter((r) => !persistedIds.has(r.id)),
      ];
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

  const removeCustomServer = useCallback(
    (id: string) => {
      if (hydrationStateRef.current === "pending") {
        removedBeforeHydration.add(id);
      }
      updateCustomServers((prev) => prev.filter((record) => record.id !== id));
    },
    [removedBeforeHydration, updateCustomServers],
  );

  return {
    customServers,
    isHydrated,
    updateCustomServers,
    removeCustomServer,
  };
};

export const McpCustomServersResource = resource(useMcpCustomServersResource);
