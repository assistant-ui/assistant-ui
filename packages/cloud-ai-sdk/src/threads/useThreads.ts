"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  CloudThread,
  UseThreadsOptions,
  UseThreadsResult,
} from "../types";
import { generateThreadTitle } from "./generateThreadTitle";

function toCloudThread(t: {
  id: string;
  title: string;
  is_archived: boolean;
  external_id: string | null;
  last_message_at: Date;
  created_at: Date;
  updated_at: Date;
}): CloudThread {
  return {
    id: t.id,
    title: t.title,
    status: t.is_archived ? "archived" : "regular",
    externalId: t.external_id,
    lastMessageAt: new Date(t.last_message_at),
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  };
}

export function useThreads(options: UseThreadsOptions): UseThreadsResult {
  const { cloud, includeArchived = false, enabled = true } = options;

  const [threads, setThreads] = useState<CloudThread[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [previousEnabled, setPreviousEnabled] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [selection, setSelection] = useState(() => ({
    scope: { cloud },
    threadId: null as string | null,
  }));
  const scope = selection.scope;
  const threadId = scope.cloud === cloud ? selection.threadId : null;

  useEffect(() => {
    setSelection((current) =>
      current.scope.cloud === cloud
        ? current
        : { scope: { cloud }, threadId: null },
    );
  }, [cloud]);

  const activeScopeRef = useRef<typeof scope | null>(scope);
  useLayoutEffect(() => {
    activeScopeRef.current = scope.cloud === cloud ? scope : null;
  }, [cloud, scope]);
  const isCurrentCloud = useCallback(
    () => scope.cloud === cloud && activeScopeRef.current === scope,
    [cloud, scope],
  );

  if (enabled !== previousEnabled) {
    setPreviousEnabled(enabled);
    if (enabled) setIsLoading(true);
  }

  const mountedRef = useRef(true);
  const refreshRequestRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const withAction = useCallback(
    async <T>(
      action: (commit: (update: () => void) => void) => Promise<T>,
      fallback: T,
      shouldUpdate: () => boolean = () => true,
    ): Promise<T> => {
      const commit = (update: () => void) => {
        if (mountedRef.current && shouldUpdate()) update();
      };
      try {
        const result = await action(commit);
        commit(() => setError(null));
        return result;
      } catch (err) {
        commit(() =>
          setError(err instanceof Error ? err : new Error(String(err))),
        );
        return fallback;
      }
    },
    [],
  );

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!isCurrentCloud()) return false;

    const requestId = ++refreshRequestRef.current;
    const isLatest = () =>
      requestId === refreshRequestRef.current && isCurrentCloud();
    setIsLoading(true);

    try {
      return await withAction(
        async (commit) => {
          const response = await cloud.threads.list(
            includeArchived ? undefined : { is_archived: false },
          );
          commit(() => setThreads(() => response.threads.map(toCloudThread)));
          return true;
        },
        false,
        isLatest,
      );
    } finally {
      if (mountedRef.current && isLatest()) {
        setIsLoading(false);
      }
    }
  }, [cloud, includeArchived, isCurrentCloud, withAction]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [refresh, enabled]);

  const get = useCallback(
    async (id: string): Promise<CloudThread | null> => {
      return await withAction(
        async () => {
          const thread = await cloud.threads.get(id);
          return toCloudThread(thread);
        },
        null,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  const create = useCallback(
    async (opts?: { externalId?: string }): Promise<CloudThread | null> => {
      return await withAction(
        async (commit) => {
          const response = await cloud.threads.create({
            last_message_at: new Date(),
            external_id: opts?.externalId,
          });
          const thread = await cloud.threads.get(response.thread_id);
          const cloudThread = toCloudThread(thread);

          commit(() => setThreads((prev) => [cloudThread, ...prev]));

          return cloudThread;
        },
        null,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  const deleteThread = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(
        async (commit) => {
          await cloud.threads.delete(id);
          commit(() => setThreads((prev) => prev.filter((t) => t.id !== id)));
          return true;
        },
        false,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  const rename = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      return await withAction(
        async (commit) => {
          await cloud.threads.update(id, { title });
          commit(() =>
            setThreads((prev) =>
              prev.map((t) => (t.id === id ? { ...t, title } : t)),
            ),
          );
          return true;
        },
        false,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(
        async (commit) => {
          await cloud.threads.update(id, { is_archived: true });

          commit(() =>
            setThreads((prev) => {
              if (includeArchived) {
                return prev.map((t) =>
                  t.id === id ? { ...t, status: "archived" } : t,
                );
              }
              return prev.filter((t) => t.id !== id);
            }),
          );

          return true;
        },
        false,
        isCurrentCloud,
      );
    },
    [cloud, includeArchived, isCurrentCloud, withAction],
  );

  const unarchive = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(
        async (commit) => {
          await cloud.threads.update(id, { is_archived: false });
          const thread = await cloud.threads.get(id);
          const cloudThread = toCloudThread(thread);

          commit(() =>
            setThreads((prev) => {
              const filtered = prev.filter((t) => t.id !== id);
              return [cloudThread, ...filtered];
            }),
          );

          return true;
        },
        false,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  const selectThread = useCallback(
    (id: string | null) => {
      setSelection((current) =>
        scope.cloud === cloud && current.scope === scope
          ? { scope, threadId: id }
          : current,
      );
    },
    [cloud, scope],
  );

  const generateTitle = useCallback(
    async (tid: string): Promise<string | null> => {
      return await withAction(
        async (commit) => {
          const title = await generateThreadTitle(cloud, tid);

          if (title) {
            commit(() =>
              setThreads((prev) =>
                prev.map((t) => (t.id === tid ? { ...t, title } : t)),
              ),
            );
          }

          return title;
        },
        null,
        isCurrentCloud,
      );
    },
    [cloud, isCurrentCloud, withAction],
  );

  return {
    cloud,
    threads,
    isLoading,
    error,
    refresh,
    get,
    create,
    delete: deleteThread,
    rename,
    archive,
    unarchive,
    threadId,
    selectThread,
    generateTitle,
  };
}
