import { useState, useMemo } from "react";
import { resource, withKey, type ResourceElement } from "@assistant-ui/tap";
import type {
  AssistantClient,
  ClientOutput,
  ScopesConfig,
} from "@assistant-ui/store";
import {
  useClientLookup,
  Derived,
  attachTransformScopes,
  useClientResource,
} from "@assistant-ui/store/client";
import { useThreadSelectionEvents } from "../../store/internal";
import { generateId } from "../../utils/id";
import { ModelContext } from "../../store/clients/model-context-client";
import { Tools } from "./Tools";
import { DataRenderers } from "./DataRenderers";

const RESOLVED_PROMISE = Promise.resolve();

export type InMemoryThreadListProps = {
  thread: (threadId: string) => ResourceElement<ClientOutput<"thread">>;
  onSwitchToThread?: (threadId: string) => void;
  onSwitchToNewThread?: () => void;
  onDelete?: (threadId: string) => void;
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
    onDelete,
  } = props;

  const [{ threads, mainThreadId }, setListState] = useState<{
    threads: readonly ThreadData[];
    mainThreadId: string;
  }>(() => ({
    threads: [{ id: "main", title: "Main Thread", status: "regular" }],
    mainThreadId: "main",
  }));
  const setThreads = (
    update: (prev: readonly ThreadData[]) => readonly ThreadData[],
  ) => setListState((prev) => ({ ...prev, threads: update(prev.threads) }));

  useThreadSelectionEvents(mainThreadId);

  const handleSwitchToThread = (threadId: string) => {
    setListState((prev) => ({ ...prev, mainThreadId: threadId }));
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
    // Deleting the last thread starts a fresh one; the removed id must not
    // stay selected. The fallback id is minted eagerly so the updater stays
    // pure under batched deletes.
    const fallbackId = `thread-${generateId()}`;
    setListState((prev) => {
      const remaining = prev.threads.filter((t) => t.id !== threadId);
      if (remaining.length === 0) {
        return {
          threads: [{ id: fallbackId, title: "New Thread", status: "regular" }],
          mainThreadId: fallbackId,
        };
      }
      return {
        threads: remaining,
        mainThreadId:
          prev.mainThreadId === threadId
            ? (remaining.find((t) => t.status === "regular") ?? remaining[0]!)
                .id
            : prev.mainThreadId,
      };
    });
    onDelete?.(threadId);
  };

  const handleSwitchToNewThread = () => {
    const newId = `thread-${generateId()}`;
    setListState((prev) => ({
      threads: [
        ...prev.threads,
        { id: newId, title: "New Thread", status: "regular" },
      ],
      mainThreadId: newId,
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
      loadError: undefined,
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
    reloadMainThread: () =>
      mainThreadClient.methods.unstable_refetchThread?.() ?? RESOLVED_PROMISE,
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
      // The lookup is keyed over the combined thread array, while index
      // selectors address the regular/archived subset the primitives render.
      const ids = selector.archived ? state.archivedThreadIds : state.threadIds;
      const id = ids[selector.index];
      if (id === undefined) return threadListItems.get({ index: -1 });
      const index = threads.findIndex((t) => t.id === id);
      return threadListItems.get({ index });
    },
    thread: () => mainThreadClient.methods,
  };
};

export const InMemoryThreadList = resource(useInMemoryThreadList);

/**
 * The scope defaults `InMemoryThreadList` installs when it is used as the
 * `threads` config entry. Adapter packages that wrap it in their own config
 * entry attach this to the wrapping resource for scope parity.
 */
export const inMemoryThreadListTransformScopes = (
  scopes: ScopesConfig,
  parent: AssistantClient,
): void => {
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
};

attachTransformScopes(useInMemoryThreadList, inMemoryThreadListTransformScopes);
