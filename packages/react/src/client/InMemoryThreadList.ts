import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { resource, withKey, type ResourceElement } from "@assistant-ui/tap";
import {
  type ClientOutput,
  useClientLookup,
  Derived,
  attachTransformScopes,
  useClientResource,
} from "@assistant-ui/store";
import { generateId } from "@assistant-ui/core";

import { ModelContext } from "@assistant-ui/core/store";
import { Tools, DataRenderers } from "@assistant-ui/core/react";

const RESOLVED_PROMISE = Promise.resolve();

export type InMemoryThreadListProps = {
  thread: (threadId: string) => ResourceElement<ClientOutput<"thread">>;
  /**
   * Called after an explicit `switchToThread()` action or an automatic
   * relocation after archiving or deleting the selected thread. Replacement
   * threads created during relocation report their generated ID here.
   */
  onSwitchToThread?: (threadId: string) => void;
  /** Called only for an explicit `switchToNewThread()` action. */
  onSwitchToNewThread?: () => void;
};

type ThreadData = {
  id: string;
  title?: string;
  status: "regular" | "archived";
  custom?: Record<string, unknown> | undefined;
};

type ThreadListData = {
  mainThreadId: string;
  threads: readonly ThreadData[];
  pendingSwitch: { threadId: string; version: number } | null;
};

const useSwitchVersion = () => {
  const versionRef = useRef(0);
  return useMemo(
    () => ({
      current: () => versionRef.current,
      advance: () => ++versionRef.current,
    }),
    [],
  );
};

const replaceChangedMainThread = (
  threads: readonly ThreadData[],
  mainThreadId: string,
  pendingSwitch: ThreadListData["pendingSwitch"],
  changedThreadId: string,
  fallback: ThreadData | undefined,
  fallbackId: string,
  switchVersion: number,
): ThreadListData => {
  if (mainThreadId !== changedThreadId) {
    return { mainThreadId, threads, pendingSwitch };
  }

  if (fallback) {
    return {
      mainThreadId: fallback.id,
      threads,
      pendingSwitch: { threadId: fallback.id, version: switchVersion },
    };
  }

  return {
    mainThreadId: fallbackId,
    pendingSwitch: { threadId: fallbackId, version: switchVersion },
    threads: [
      ...threads,
      { id: fallbackId, title: "New Thread", status: "regular" },
    ],
  };
};

// ThreadListItem Client
const useThreadListItemClient = (props: {
  data: ThreadData;
  isRunning: boolean;
  onSwitchTo: () => void;
  onRename: (title: string) => void;
  onUpdateCustom: (custom: Record<string, unknown> | undefined) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}): ClientOutput<"threadListItem"> => {
  const {
    data,
    isRunning,
    onSwitchTo,
    onRename,
    onUpdateCustom,
    onArchive,
    onUnarchive,
    onDelete,
  } = props;
  const state = useMemo(
    () => ({
      id: data.id,
      remoteId: undefined,
      externalId: undefined,
      title: data.title,
      status: data.status,
      custom: data.custom,
      isRunning,
    }),
    [data.id, data.title, data.status, data.custom, isRunning],
  );

  return {
    getState: () => state,
    switchTo: onSwitchTo,
    rename: onRename,
    updateCustom: onUpdateCustom,
    archive: onArchive,
    unarchive: onUnarchive,
    delete: onDelete,
    generateTitle: () => {},
    initialize: async () => ({ remoteId: data.id, externalId: undefined }),
    detach: () => {},
  };
};

const ThreadListItemClient = resource(useThreadListItemClient);

// InMemoryThreadList Client
const useInMemoryThreadList = (
  props: InMemoryThreadListProps,
): ClientOutput<"threads"> => {
  const {
    thread: threadFactory,
    onSwitchToThread,
    onSwitchToNewThread,
  } = props;

  const switchVersion = useSwitchVersion();
  const [{ mainThreadId, threads, pendingSwitch }, setThreadList] =
    useState<ThreadListData>(() => ({
      mainThreadId: "main",
      threads: [{ id: "main", title: "Main Thread", status: "regular" }],
      pendingSwitch: null,
    }));
  const flushPendingSwitch = useEffectEvent(
    (pending: NonNullable<ThreadListData["pendingSwitch"]>) => {
      if (switchVersion.current() !== pending.version) return;

      setThreadList((prev) =>
        prev.pendingSwitch === pending
          ? { ...prev, pendingSwitch: null }
          : prev,
      );
      onSwitchToThread?.(pending.threadId);
    },
  );

  useEffect(() => {
    if (pendingSwitch === null) return;
    flushPendingSwitch(pendingSwitch);
  }, [pendingSwitch]);

  const handleSwitchToThread = (threadId: string) => {
    switchVersion.advance();
    setThreadList((prev) =>
      prev.mainThreadId === threadId && prev.pendingSwitch === null
        ? prev
        : {
            ...prev,
            mainThreadId: threadId,
            pendingSwitch: null,
          },
    );
    onSwitchToThread?.(threadId);
  };

  const handleRename = (threadId: string, title: string) => {
    setThreadList((prev) => ({
      ...prev,
      threads: prev.threads.map((t) =>
        t.id === threadId ? { ...t, title } : t,
      ),
    }));
  };

  const handleArchive = (threadId: string) => {
    const fallbackId = `thread-${generateId()}`;
    const currentSwitchVersion = switchVersion.current();
    setThreadList((prev) => {
      const thread = prev.threads.find((item) => item.id === threadId);
      if (thread?.status !== "regular") return prev;

      const nextThreads = prev.threads.map((t) =>
        t.id === threadId ? { ...t, status: "archived" as const } : t,
      );
      return replaceChangedMainThread(
        nextThreads,
        prev.mainThreadId,
        prev.pendingSwitch,
        threadId,
        nextThreads.find((item) => item.status === "regular"),
        fallbackId,
        currentSwitchVersion,
      );
    });
  };

  const handleUnarchive = (threadId: string) => {
    setThreadList((prev) => ({
      ...prev,
      threads: prev.threads.map((t) =>
        t.id === threadId ? { ...t, status: "regular" as const } : t,
      ),
    }));
  };

  const handleUpdateCustom = (
    threadId: string,
    custom: Record<string, unknown> | undefined,
  ) => {
    setThreadList((prev) => ({
      ...prev,
      threads: prev.threads.map((t) =>
        t.id === threadId ? { ...t, custom } : t,
      ),
    }));
  };

  const handleDelete = (threadId: string) => {
    const fallbackId = `thread-${generateId()}`;
    const currentSwitchVersion = switchVersion.current();
    setThreadList((prev) => {
      if (!prev.threads.some((thread) => thread.id === threadId)) return prev;

      const nextThreads = prev.threads.filter((t) => t.id !== threadId);
      return replaceChangedMainThread(
        nextThreads,
        prev.mainThreadId,
        prev.pendingSwitch,
        threadId,
        // Deletion may select an archived sibling to retain that conversation.
        nextThreads[0],
        fallbackId,
        currentSwitchVersion,
      );
    });
  };

  const handleSwitchToNewThread = () => {
    const newId = `thread-${generateId()}`;
    switchVersion.advance();
    setThreadList((prev) => ({
      mainThreadId: newId,
      pendingSwitch: null,
      threads: [
        ...prev.threads,
        { id: newId, title: "New Thread", status: "regular" },
      ],
    }));
    onSwitchToNewThread?.();
  };

  // Only the main thread is mounted, so it is the only thread that can run.
  const mainThreadClient = useClientResource(threadFactory(mainThreadId));

  const threadListItems = useClientLookup(
    threads.map((t) =>
      withKey(
        t.id,
        ThreadListItemClient({
          data: t,
          isRunning: t.id === mainThreadId && mainThreadClient.state.isRunning,
          onSwitchTo: () => handleSwitchToThread(t.id),
          onRename: (title) => handleRename(t.id, title),
          onUpdateCustom: (custom) => handleUpdateCustom(t.id, custom),
          onArchive: () => handleArchive(t.id),
          onUnarchive: () => handleUnarchive(t.id),
          onDelete: () => handleDelete(t.id),
        }),
      ),
    ),
  );

  const state = useMemo(() => {
    const regularThreads = threads.filter((t) => t.status === "regular");
    const archivedThreads = threads.filter((t) => t.status === "archived");

    return {
      mainThreadId,
      newThreadId: null,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      threadIds: regularThreads.map((t) => t.id),
      archivedThreadIds: archivedThreads.map((t) => t.id),
      threadItems: threadListItems.state,
      main: mainThreadClient.state,
    };
  }, [mainThreadId, threads, threadListItems.state, mainThreadClient.state]);

  return {
    getState: () => state,
    switchToThread: handleSwitchToThread,
    switchToNewThread: handleSwitchToNewThread,
    getLoadThreadsPromise: () => RESOLVED_PROMISE,
    reload: () => RESOLVED_PROMISE,
    reloadMainThread: () => RESOLVED_PROMISE,
    loadMore: () => RESOLVED_PROMISE,
    item: (selector) => {
      if (selector === "main") {
        const index = threads.findIndex((t) => t.id === mainThreadId);
        return threadListItems.get({ index: index === -1 ? 0 : index });
      }
      if ("id" in selector) {
        const index = threads.findIndex((t) => t.id === selector.id);
        return threadListItems.get({ index });
      }
      return threadListItems.get(selector);
    },
    thread: () => mainThreadClient.methods,
  };
};

export const InMemoryThreadList = resource(useInMemoryThreadList);

attachTransformScopes(useInMemoryThreadList, (scopes, parent) => {
  scopes.thread ??= Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads.thread("main"),
  });
  scopes.threadListItem ??= Derived({
    source: "threads",
    query: { type: "main" },
    get: (aui) => aui.threads.item("main"),
  });
  scopes.composer ??= Derived({
    source: "thread",
    query: {},
    get: (aui) => aui.threads.thread("main").composer(),
  });

  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
  if (!scopes.tools && parent.tools.source === null) {
    scopes.tools = Tools({});
  }
  if (!scopes.dataRenderers && parent.dataRenderers.source === null) {
    scopes.dataRenderers = DataRenderers();
  }
  if (!scopes.suggestions && parent.suggestions.source === null) {
    scopes.suggestions = Derived({
      source: "thread",
      query: {},
      get: (aui) => aui.thread.suggestions(),
    });
  }
});
