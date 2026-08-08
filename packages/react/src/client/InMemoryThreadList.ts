import { useState, useMemo } from "react";
import { resource, withKey, type ResourceElement } from "@assistant-ui/tap";
import {
  type ClientOutput,
  useClientLookup,
  Derived,
  attachTransformScopes,
  useClientResource,
} from "@assistant-ui/store";

import { ModelContext, Suggestions } from "@assistant-ui/core/store";
import { Tools, DataRenderers } from "@assistant-ui/core/react";

const RESOLVED_PROMISE = Promise.resolve();

export type InMemoryThreadListProps = {
  thread: (threadId: string) => ResourceElement<ClientOutput<"thread">>;
  onSwitchToThread?: (threadId: string) => void;
  onSwitchToNewThread?: () => void;
};

type ThreadData = {
  id: string;
  title?: string;
  status: "regular" | "archived";
  custom?: Record<string, unknown> | undefined;
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

  const [mainThreadId, setMainThreadId] = useState("main");
  const [threads, setThreads] = useState<readonly ThreadData[]>(() => [
    { id: "main", title: "Main Thread", status: "regular" },
  ]);

  const handleSwitchToThread = (threadId: string) => {
    setMainThreadId(threadId);
    onSwitchToThread?.(threadId);
  };

  const handleRename = (threadId: string, title: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, title } : t)),
    );
  };

  const handleArchive = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, status: "archived" as const } : t,
      ),
    );
  };

  const handleUnarchive = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, status: "regular" as const } : t,
      ),
    );
  };

  const handleUpdateCustom = (
    threadId: string,
    custom: Record<string, unknown> | undefined,
  ) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, custom } : t)),
    );
  };

  const handleDelete = (threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    setMainThreadId((prev) =>
      prev === threadId
        ? threads.find((t) => t.id !== threadId)?.id || "main"
        : prev,
    );
  };

  const handleSwitchToNewThread = () => {
    const newId = `thread-${Date.now()}`;
    setThreads((prev) => [
      ...prev,
      { id: newId, title: "New Thread", status: "regular" },
    ]);
    setMainThreadId(newId);
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
    scopes.suggestions = Suggestions();
  }
});
