"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const withAction = useCallback(
    async <T>(action: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        const result = await action();
        if (mountedRef.current) setError(null);
        return result;
      } catch (err) {
        if (mountedRef.current)
          setError(err instanceof Error ? err : new Error(String(err)));
        return fallback;
      }
    },
    [],
  );

  const refresh = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      return await withAction(async () => {
        const response = await cloud.threads.list(
          includeArchived ? undefined : { is_archived: false },
        );
        if (mountedRef.current) {
          setThreads(() => response.threads.map(toCloudThread));
        }
        return true;
      }, false);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [cloud, includeArchived, withAction]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [refresh, enabled]);

  const get = useCallback(
    async (id: string): Promise<CloudThread | null> => {
      return await withAction(async () => {
        const thread = await cloud.threads.get(id);
        return toCloudThread(thread);
      }, null);
    },
    [cloud, withAction],
  );

  const create = useCallback(
    async (opts?: { externalId?: string }): Promise<CloudThread | null> => {
      return await withAction(async () => {
        const response = await cloud.threads.create({
          last_message_at: new Date(),
          external_id: opts?.externalId,
        });
        const thread = await cloud.threads.get(response.thread_id);
        const cloudThread = toCloudThread(thread);

        if (mountedRef.current) {
          setThreads((prev) => [cloudThread, ...prev]);
        }

        return cloudThread;
      }, null);
    },
    [cloud, withAction],
  );

  const deleteThread = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(async () => {
        await cloud.threads.delete(id);
        if (mountedRef.current) {
          setThreads((prev) => prev.filter((t) => t.id !== id));
        }
        return true;
      }, false);
    },
    [cloud, withAction],
  );

  const rename = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      return await withAction(async () => {
        await cloud.threads.update(id, { title });
        if (mountedRef.current) {
          setThreads((prev) =>
            prev.map((t) => (t.id === id ? { ...t, title } : t)),
          );
        }
        return true;
      }, false);
    },
    [cloud, withAction],
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(async () => {
        await cloud.threads.update(id, { is_archived: true });

        if (mountedRef.current) {
          setThreads((prev) => {
            if (includeArchived) {
              return prev.map((t) =>
                t.id === id ? { ...t, status: "archived" } : t,
              );
            }
            return prev.filter((t) => t.id !== id);
          });
        }

        return true;
      }, false);
    },
    [cloud, includeArchived, withAction],
  );

  const unarchive = useCallback(
    async (id: string): Promise<boolean> => {
      return await withAction(async () => {
        await cloud.threads.update(id, { is_archived: false });
        const thread = await cloud.threads.get(id);
        const cloudThread = toCloudThread(thread);

        if (mountedRef.current) {
          setThreads((prev) => {
            const filtered = prev.filter((t) => t.id !== id);
            return [cloudThread, ...filtered];
          });
        }

        return true;
      }, false);
    },
    [cloud, withAction],
  );

  const selectThread = useCallback((id: string | null) => {
    setThreadId(id);
  }, []);

  const generateTitle = useCallback(
    async (tid: string): Promise<string | null> => {
      return await withAction(async () => {
        const title = await generateThreadTitle(cloud, tid);

        if (title && mountedRef.current) {
          setThreads((prev) =>
            prev.map((t) => (t.id === tid ? { ...t, title } : t)),
          );
        }

        return title;
      }, null);
    },
    [cloud, withAction],
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
