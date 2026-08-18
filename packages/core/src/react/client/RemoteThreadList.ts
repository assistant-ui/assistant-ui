import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { resource, withKey } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import {
  attachTransformScopes,
  useClientLookup,
  useClientResource,
} from "@assistant-ui/store/client";
import { isDevelopment, useThreadSelectionEvents } from "../../store/internal";
import { generateId } from "../../utils/id";
import { OptimisticState } from "../../runtimes/remote-thread-list/optimistic-state";
import {
  classifyThreads,
  createThreadMappingId,
  getThreadData,
  normalizeCursor,
  updateStatusReducer,
  type RemoteThreadData,
  type RemoteThreadState,
} from "../../runtimes/remote-thread-list/remote-thread-state";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
} from "../../runtimes/remote-thread-list/types";
import type { ThreadMessage } from "../../types/message";
import { AssistantMessageStream } from "assistant-stream";
import { handleThreadListAction } from "../../store/runtime-clients/handle-thread-list-action";
import {
  inMemoryThreadListTransformScopes,
  type InMemoryThreadListProps,
} from "./InMemoryThreadList";
import { AdaptedRemoteThread } from "./AdaptedRemoteThread";

const RESOLVED_PROMISE = Promise.resolve();

const EMPTY_LIST: RemoteThreadState = {
  isLoading: true,
  isLoadingMore: false,
  cursor: undefined,
  newThreadId: undefined,
  threadIds: [],
  archivedThreadIds: [],
  threadIdMap: {},
  threadData: {},
};

export type RemoteThreadListProps = {
  /**
   * Swapping this to a different backing store does not reload the list. Call `reload()` after a genuine swap. A recreated object for the same store is a no-op.
   */
  adapter: RemoteThreadListAdapter;
  /**
   * Factory for the visible thread. Per-thread history reload requires a
   * resource keyed by thread id (`withKey(id, thread(...))`). An unkeyed
   * factory keeps one instance across switches, so a mount-once history
   * loader will not fetch the next thread.
   */
  thread: InMemoryThreadListProps["thread"];
  threadId?: string | undefined;
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  onSwitchToThread?: ((threadId: string) => void) | undefined;
  onSwitchToNewThread?: (() => void) | undefined;
  onDelete?: ((threadId: string) => void) | undefined;
};

const threadNotFoundError = (threadIdOrRemoteId: string, action: string) =>
  new Error(`Thread "${threadIdOrRemoteId}" was not found while ${action}.`);

const threadStatusError = (
  threadIdOrRemoteId: string,
  status: RemoteThreadData["status"],
  action: string,
) =>
  new Error(
    `Thread "${threadIdOrRemoteId}" has status "${status}", so it cannot ${action}.`,
  );

const toInitializeResult = (
  result: RemoteThreadInitializeResponse,
): { remoteId: string; externalId: string | undefined } => ({
  remoteId: result.remoteId,
  externalId: result.externalId,
});

const applyTitleStream = async (
  stream: Parameters<typeof AssistantMessageStream.fromAssistantStream>[0],
  onTitle: (title: string | undefined) => void,
) => {
  const messageStream = AssistantMessageStream.fromAssistantStream(stream);
  for await (const result of messageStream) {
    onTitle(result.parts.filter((part) => part.type === "text")[0]?.text);
  }
};

const seedNewThread = (
  state: RemoteThreadState,
): { id: string; state: RemoteThreadState } => {
  let id: string;
  do {
    id = `__LOCALID_${generateId()}`;
  } while (state.threadIdMap[id]);
  const mappingId = createThreadMappingId(id);
  return {
    id,
    state: {
      ...state,
      newThreadId: id,
      threadIdMap: {
        ...state.threadIdMap,
        [id]: mappingId,
      },
      threadData: {
        ...state.threadData,
        [mappingId]: {
          status: "new",
          id,
          remoteId: undefined,
          externalId: undefined,
          title: undefined,
          custom: undefined,
        },
      },
    },
  };
};

const useThreadListItemClient = (props: {
  data: RemoteThreadData;
  isRunning: boolean;
  onSwitchTo: (options?: { unarchive?: boolean }) => void;
  onRename: (title: string) => void;
  onUpdateCustom: (custom: Record<string, unknown> | undefined) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onGenerateTitle: () => void;
  onInitialize: () => Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  onDetach: () => void;
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
    onGenerateTitle,
    onInitialize,
    onDetach,
  } = props;
  const state = useMemo(
    () => ({
      id: data.id,
      remoteId: data.remoteId,
      externalId: data.externalId,
      title: data.title,
      lastMessageAt: "lastMessageAt" in data ? data.lastMessageAt : undefined,
      status: data.status,
      custom: data.custom,
      isRunning,
    }),
    [data, isRunning],
  );

  return {
    getState: () => state,
    switchTo: onSwitchTo,
    rename: onRename,
    updateCustom: onUpdateCustom,
    archive: onArchive,
    unarchive: onUnarchive,
    delete: onDelete,
    generateTitle: onGenerateTitle,
    initialize: onInitialize,
    detach: onDetach,
  };
};

const ThreadListItemClient = resource(useThreadListItemClient);

const collectItemOrder = (
  listState: RemoteThreadState,
  mainThreadId: string,
): RemoteThreadData[] => {
  const ids = [
    listState.newThreadId,
    ...listState.threadIds,
    ...listState.archivedThreadIds,
    mainThreadId,
  ].filter((id): id is string => id !== undefined);
  const seenIds = new Set<string>();
  const seenRemoteIds = new Set<string>();
  const items: RemoteThreadData[] = [];
  for (const id of ids) {
    const data = getThreadData(listState, id);
    if (!data || seenIds.has(data.id)) continue;
    if (data.remoteId !== undefined && seenRemoteIds.has(data.remoteId)) {
      continue;
    }
    seenIds.add(data.id);
    if (data.remoteId !== undefined) seenRemoteIds.add(data.remoteId);
    items.push(data);
  }
  return items;
};

const itemMatchesId = (
  item: RemoteThreadData,
  listState: RemoteThreadState,
  id: string,
) => {
  const data = getThreadData(listState, id);
  return (
    item.id === id ||
    item.id === data?.id ||
    (data?.remoteId !== undefined &&
      (item.id === data.remoteId || item.remoteId === data.remoteId))
  );
};

const isSameThread = (
  listState: RemoteThreadState,
  left: string,
  right: string,
) => {
  if (left === right) return true;
  const data = getThreadData(listState, left);
  return data !== undefined && itemMatchesId(data, listState, right);
};

const useRemoteThreadListView = ({
  listState,
  mainThreadId,
  threadFactory,
  useAdapters,
  onSwitchTo,
  onRename,
  onUpdateCustom,
  onArchive,
  onUnarchive,
  onDelete,
  onGenerateTitle,
  onInitialize,
  onDetach,
}: {
  listState: RemoteThreadState;
  mainThreadId: string;
  threadFactory: RemoteThreadListProps["thread"];
  useAdapters: RemoteThreadListAdapter["unstable_useAdapters"];
  onSwitchTo: (
    threadId: string,
    options?: { unarchive?: boolean },
  ) => Promise<void>;
  onRename: (threadId: string, title: string) => Promise<void>;
  onUpdateCustom: (
    threadId: string,
    custom: Record<string, unknown> | undefined,
  ) => Promise<void>;
  onArchive: (threadId: string) => Promise<void>;
  onUnarchive: (threadId: string) => Promise<void>;
  onDelete: (threadId: string) => Promise<void>;
  onGenerateTitle: (
    threadId: string,
    messages: readonly ThreadMessage[] | undefined,
  ) => Promise<void>;
  onInitialize: (threadId: string) => Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  onDetach: (threadId: string) => Promise<void>;
}) => {
  const thread = threadFactory(mainThreadId);
  const wrapped =
    useAdapters === undefined
      ? thread
      : AdaptedRemoteThread({
          useAdapters,
          thread,
        });
  const mainThreadClient = useClientResource(
    thread.key === undefined ? wrapped : withKey(thread.key, wrapped),
  );
  const itemOrder = useMemo(
    () => collectItemOrder(listState, mainThreadId),
    [listState, mainThreadId],
  );
  const threadListItems = useClientLookup(
    itemOrder.map((data) =>
      withKey(
        data.id,
        ThreadListItemClient({
          data,
          isRunning:
            itemMatchesId(data, listState, mainThreadId) &&
            mainThreadClient.state.isRunning,
          onSwitchTo: (options) =>
            handleThreadListAction("switch", () =>
              onSwitchTo(data.id, options),
            ),
          onRename: (title) =>
            handleThreadListAction("rename", () => onRename(data.id, title)),
          onUpdateCustom: (custom) =>
            handleThreadListAction("update custom metadata", () =>
              onUpdateCustom(data.id, custom),
            ),
          onArchive: () =>
            handleThreadListAction("archive", () => onArchive(data.id)),
          onUnarchive: () =>
            handleThreadListAction("unarchive", () => onUnarchive(data.id)),
          onDelete: () =>
            handleThreadListAction("delete", () => onDelete(data.id)),
          onGenerateTitle: () =>
            handleThreadListAction("generate title", () =>
              onGenerateTitle(
                data.id,
                mainThreadClient.state.messages as
                  | readonly ThreadMessage[]
                  | undefined,
              ),
            ),
          onInitialize: () => onInitialize(data.id),
          onDetach: () =>
            handleThreadListAction("detach", () => onDetach(data.id)),
        }),
      ),
    ),
  );
  return { mainThreadClient, itemOrder, threadListItems };
};

const useRemoteThreadList = (
  props: RemoteThreadListProps,
): ClientOutput<"threads"> => {
  const {
    adapter,
    thread: threadFactory,
    threadId,
    onThreadIdChange,
    onSwitchToThread,
    onSwitchToNewThread,
    onDelete,
  } = props;

  const [{ store, initialMainId, session }] = useState(() => {
    const seeded = seedNewThread(EMPTY_LIST);
    return {
      store: new OptimisticState(seeded.state),
      initialMainId: seeded.id,
      session: {
        adapter,
        loadGeneration: 0,
        switchGeneration: 0,
        loadPromise: undefined as Promise<void> | undefined,
        loadMorePromise: undefined as Promise<void> | undefined,
        lastNotifiedRemoteId: undefined as string | undefined,
        lastControlledThreadId: undefined as string | undefined,
        switchTask: undefined as Promise<void> | undefined,
        mainThreadId: seeded.id,
        isFirstThreadIdEffect: true,
        onThreadIdChange,
        onSwitchToThread,
        onSwitchToNewThread,
      },
    };
  });

  const listState = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.value,
    () => store.value,
  );

  const [mainThreadId, setMainThreadId] = useState(initialMainId);
  const assignMainThreadId = useCallback(
    (id: string) => {
      session.mainThreadId = id;
      setMainThreadId(id);
    },
    [session],
  );
  useThreadSelectionEvents(mainThreadId);
  useEffect(() => {
    session.adapter = adapter;
    session.mainThreadId = mainThreadId;
    session.onThreadIdChange = onThreadIdChange;
    session.onSwitchToThread = onSwitchToThread;
    session.onSwitchToNewThread = onSwitchToNewThread;
  }, [
    adapter,
    mainThreadId,
    onSwitchToNewThread,
    onSwitchToThread,
    onThreadIdChange,
    session,
  ]);

  const notifyRemoteId = useCallback(
    (remoteId: string | undefined, emit: boolean) => {
      if (session.lastNotifiedRemoteId === remoteId) return;
      session.lastNotifiedRemoteId = remoteId;
      if (emit) session.onThreadIdChange?.(remoteId);
    },
    [session],
  );

  const getLoadThreadsPromise = useCallback(() => {
    if (session.loadPromise) return session.loadPromise;
    const generation = session.loadGeneration;
    session.loadPromise = store
      .optimisticUpdate({
        execute: () => session.adapter.list(),
        loading: (state) => ({ ...state, isLoading: true }),
        then: (state, page) => {
          if (generation !== session.loadGeneration) return state;
          const fresh = classifyThreads(page.threads, {
            threadIds: [],
            archivedThreadIds: [],
            threadIdMap: {},
            threadData: {},
          });
          return {
            ...state,
            isLoading: false,
            cursor: normalizeCursor(page.nextCursor),
            threadIds: fresh.threadIds,
            archivedThreadIds: fresh.archivedThreadIds,
            threadIdMap: {
              ...state.threadIdMap,
              ...fresh.threadIdMap,
            },
            threadData: {
              ...state.threadData,
              ...fresh.threadData,
            },
          };
        },
      })
      .catch((error: unknown) => {
        if (generation !== session.loadGeneration) return;
        console.error("[assistant-ui] thread list load failed:", error);
        session.loadPromise = undefined;
        store.update({
          ...store.baseValue,
          isLoading: false,
        });
      })
      .then(() => {});
    return session.loadPromise;
  }, [session, store]);

  const reload = useCallback(() => {
    session.loadGeneration++;
    session.loadPromise = undefined;
    session.loadMorePromise = undefined;
    store.update({
      ...store.baseValue,
      cursor: undefined,
    });
    return getLoadThreadsPromise();
  }, [getLoadThreadsPromise, session, store]);

  useEffect(() => {
    void getLoadThreadsPromise();
  }, [getLoadThreadsPromise]);

  useEffect(() => {
    if (!isDevelopment) return;
    if (adapter.unstable_useAdapters !== undefined) return;
    if (adapter.unstable_Provider === undefined) return;
    console.warn(
      "[assistant-ui] RemoteThreadList ignores RemoteThreadListAdapter.unstable_Provider. Expose unstable_useAdapters so per-thread history loads on this entry. useRemoteThreadListRuntime still honors unstable_Provider.",
    );
  }, [adapter]);

  const loadMore = useCallback(() => {
    if (session.loadMorePromise) return session.loadMorePromise;
    const snapshot = store.value;
    if (snapshot.cursor === undefined || snapshot.isLoading) {
      return RESOLVED_PROMISE;
    }
    const generation = session.loadGeneration;
    const cursor = snapshot.cursor;
    const currentAdapter = session.adapter;
    const task = store
      .optimisticUpdate({
        execute: () => currentAdapter.list({ after: cursor }),
        loading: (state) => ({ ...state, isLoadingMore: true }),
        then: (state, page) => {
          if (generation !== session.loadGeneration) return state;
          const appended = classifyThreads(page.threads, {
            threadIds: [...state.threadIds],
            archivedThreadIds: [...state.archivedThreadIds],
            threadIdMap: { ...state.threadIdMap },
            threadData: { ...state.threadData },
          });
          return {
            ...state,
            isLoadingMore: false,
            cursor: normalizeCursor(page.nextCursor),
            threadIds: appended.threadIds,
            archivedThreadIds: appended.archivedThreadIds,
            threadIdMap: appended.threadIdMap,
            threadData: appended.threadData,
          };
        },
      })
      .catch((error: unknown) => {
        console.error("[assistant-ui] thread list loadMore failed:", error);
      })
      .then(() => {
        if (session.loadMorePromise === task) {
          session.loadMorePromise = undefined;
        }
      });
    session.loadMorePromise = task;
    return task;
  }, [session, store]);

  const startSwitch = useCallback(
    (run: (generation: number) => Promise<void>) => {
      const generation = ++session.switchGeneration;
      let settle!: (error?: unknown) => void;
      const task = new Promise<void>((resolve, reject) => {
        settle = (error) => {
          if (error === undefined) resolve();
          else reject(error);
        };
      });
      session.switchTask = task;
      void run(generation).then(
        () => settle(),
        (error: unknown) => settle(error),
      );
      return task;
    },
    [session],
  );

  const switchToThread = useCallback(
    (
      threadIdOrRemoteId: string,
      options?: { unarchive?: boolean },
      emitThreadIdChange = true,
    ) =>
      startSwitch(async (generation) => {
        let data = getThreadData(store.value, threadIdOrRemoteId);
        if (!data) {
          const remoteMetadata =
            await session.adapter.fetch(threadIdOrRemoteId);
          if (generation !== session.switchGeneration) return;
          const state = store.value;
          const mappingId = createThreadMappingId(remoteMetadata.remoteId);
          const wasInTarget =
            remoteMetadata.status === "regular"
              ? state.threadIds.includes(remoteMetadata.remoteId)
              : state.archivedThreadIds.includes(remoteMetadata.remoteId);
          const threadIdsWithoutRemote = state.threadIds.filter(
            (id) => id !== remoteMetadata.remoteId,
          );
          const archivedThreadIdsWithoutRemote = state.archivedThreadIds.filter(
            (id) => id !== remoteMetadata.remoteId,
          );
          store.update({
            ...state,
            threadIds:
              remoteMetadata.status === "regular"
                ? wasInTarget
                  ? state.threadIds
                  : [...threadIdsWithoutRemote, remoteMetadata.remoteId]
                : threadIdsWithoutRemote,
            archivedThreadIds:
              remoteMetadata.status === "archived"
                ? wasInTarget
                  ? state.archivedThreadIds
                  : [...archivedThreadIdsWithoutRemote, remoteMetadata.remoteId]
                : archivedThreadIdsWithoutRemote,
            threadIdMap: {
              ...state.threadIdMap,
              [remoteMetadata.remoteId]: mappingId,
            },
            threadData: {
              ...state.threadData,
              [mappingId]: {
                id: mappingId,
                initializeTask: Promise.resolve({
                  remoteId: remoteMetadata.remoteId,
                  externalId: remoteMetadata.externalId,
                }),
                remoteId: remoteMetadata.remoteId,
                externalId: remoteMetadata.externalId,
                status: remoteMetadata.status,
                title: remoteMetadata.title,
                lastMessageAt: remoteMetadata.lastMessageAt,
                custom: remoteMetadata.custom,
              },
            },
          });
          data = getThreadData(store.value, threadIdOrRemoteId);
        }
        if (!data) {
          throw threadNotFoundError(threadIdOrRemoteId, "switching to it");
        }
        if (isSameThread(store.value, data.id, session.mainThreadId)) return;
        if (data.status === "archived" && options?.unarchive !== false) {
          const current = data;
          const { remoteId } = await current.initializeTask;
          if (generation !== session.switchGeneration) return;
          await store.optimisticUpdate({
            execute: () => session.adapter.unarchive(remoteId),
            optimistic: (state) =>
              updateStatusReducer(state, current.id, "regular"),
          });
          if (generation !== session.switchGeneration) return;
          data = getThreadData(store.value, current.id) ?? current;
        }
        if (generation !== session.switchGeneration) return;
        assignMainThreadId(data.id);
        notifyRemoteId(data.remoteId, emitThreadIdChange);
        session.onSwitchToThread?.(data.id);
      }),
    [assignMainThreadId, notifyRemoteId, session, startSwitch, store],
  );

  const switchToNewThread = useCallback(
    (emitThreadIdChange = true) =>
      startSwitch(async (generation) => {
        while (
          store.baseValue.newThreadId !== undefined &&
          store.value.newThreadId === undefined
        ) {
          await store.waitForUpdate();
          if (generation !== session.switchGeneration) return;
        }
        const existing = store.value.newThreadId;
        if (existing !== undefined) {
          const existingId =
            getThreadData(store.value, existing)?.id ?? existing;
          if (isSameThread(store.value, existingId, session.mainThreadId)) {
            return;
          }
          assignMainThreadId(existingId);
          notifyRemoteId(undefined, emitThreadIdChange);
          session.onSwitchToNewThread?.();
          return;
        }
        const seeded = seedNewThread(store.baseValue);
        store.update(seeded.state);
        if (generation !== session.switchGeneration) return;
        assignMainThreadId(seeded.id);
        notifyRemoteId(undefined, emitThreadIdChange);
        session.onSwitchToNewThread?.();
      }),
    [assignMainThreadId, notifyRemoteId, session, startSwitch, store],
  );

  const ensureNotMain = useCallback(
    async (threadId: string) => {
      if (threadId === store.value.newThreadId) {
        throw new Error("Cannot ensure new thread is not main");
      }
      let lastAwaitedTask: Promise<void> | undefined;
      while (isSameThread(store.value, threadId, session.mainThreadId)) {
        let switchTask = session.switchTask;
        const startedFallback = !switchTask || switchTask === lastAwaitedTask;
        if (startedFallback) {
          switchTask = switchToNewThread();
        }
        lastAwaitedTask = switchTask;
        try {
          await switchTask;
        } catch (error) {
          if (startedFallback && session.switchTask === switchTask) {
            throw error;
          }
        }
      }
    },
    [session, store, switchToNewThread],
  );

  const initialize = useCallback(
    async (threadId: string) => {
      if (store.value.newThreadId !== threadId) {
        const data = getThreadData(store.value, threadId);
        if (!data) throw threadNotFoundError(threadId, "initializing it");
        if (data.status === "new") {
          throw threadStatusError(threadId, data.status, "be initialized here");
        }
        return toInitializeResult(await data.initializeTask);
      }
      const result = await store.optimisticUpdate({
        execute: () => session.adapter.initialize(threadId),
        optimistic: (state) => updateStatusReducer(state, threadId, "regular"),
        loading: (state, task) => {
          const mappingId = createThreadMappingId(threadId);
          return {
            ...state,
            threadData: {
              ...state.threadData,
              [mappingId]: {
                ...state.threadData[mappingId],
                initializeTask: task,
              },
            },
          };
        },
        then: (state, { remoteId, externalId }) => {
          const data = getThreadData(state, threadId);
          if (!data) return state;
          const mappingId = createThreadMappingId(threadId);
          return {
            ...state,
            threadIdMap: {
              ...state.threadIdMap,
              [remoteId]: mappingId,
            },
            threadData: {
              ...state.threadData,
              [mappingId]: {
                ...data,
                initializeTask: Promise.resolve({ remoteId, externalId }),
                remoteId,
                externalId,
              },
            },
          };
        },
      });
      if (threadId === session.mainThreadId) {
        notifyRemoteId(result.remoteId, true);
      }
      return toInitializeResult(result);
    },
    [notifyRemoteId, session, store],
  );

  const rename = useCallback(
    (threadIdOrRemoteId: string, newTitle: string) => {
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) throw threadNotFoundError(threadIdOrRemoteId, "renaming it");
      if (data.status === "new") {
        throw threadStatusError(threadIdOrRemoteId, data.status, "be renamed");
      }
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          return session.adapter.rename(remoteId, newTitle);
        },
        optimistic: (state) => {
          const current = getThreadData(state, threadIdOrRemoteId);
          if (!current) return state;
          return {
            ...state,
            threadData: {
              ...state.threadData,
              [current.id]: {
                ...current,
                title: newTitle,
              },
            },
          };
        },
      });
    },
    [session, store],
  );

  const updateCustom = useCallback(
    (
      threadIdOrRemoteId: string,
      custom: Record<string, unknown> | undefined,
    ) => {
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) {
        throw threadNotFoundError(
          threadIdOrRemoteId,
          "updating its custom metadata",
        );
      }
      if (data.status === "new") {
        throw threadStatusError(
          threadIdOrRemoteId,
          data.status,
          "update custom metadata",
        );
      }
      if (!session.adapter.updateCustom) {
        throw new Error(
          "Remote thread list adapter does not support updating custom metadata",
        );
      }
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          const currentAdapter = session.adapter;
          if (!currentAdapter.updateCustom) {
            throw new Error(
              "Remote thread list adapter does not support updating custom metadata",
            );
          }
          return currentAdapter.updateCustom(remoteId, custom);
        },
        optimistic: (state) => {
          const current = getThreadData(state, threadIdOrRemoteId);
          if (!current) return state;
          return {
            ...state,
            threadData: {
              ...state.threadData,
              [current.id]: {
                ...current,
                custom,
              },
            },
          };
        },
      });
    },
    [session, store],
  );

  const archive = useCallback(
    async (threadIdOrRemoteId: string) => {
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) throw threadNotFoundError(threadIdOrRemoteId, "archiving it");
      if (data.status !== "regular") {
        throw threadStatusError(threadIdOrRemoteId, data.status, "be archived");
      }
      await ensureNotMain(data.id);
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          return session.adapter.archive(remoteId);
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "archived"),
      });
    },
    [ensureNotMain, session, store],
  );

  const unarchive = useCallback(
    (threadIdOrRemoteId: string) => {
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data)
        throw threadNotFoundError(threadIdOrRemoteId, "unarchiving it");
      if (data.status !== "archived") {
        throw threadStatusError(
          threadIdOrRemoteId,
          data.status,
          "be unarchived",
        );
      }
      return store.optimisticUpdate({
        execute: async () => {
          try {
            const { remoteId } = await data.initializeTask;
            return await session.adapter.unarchive(remoteId);
          } catch (error) {
            await ensureNotMain(data.id);
            throw error;
          }
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "regular"),
      });
    },
    [ensureNotMain, session, store],
  );

  const deleteThread = useCallback(
    async (threadIdOrRemoteId: string) => {
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) throw threadNotFoundError(threadIdOrRemoteId, "deleting it");
      if (data.status !== "regular" && data.status !== "archived") {
        throw threadStatusError(threadIdOrRemoteId, data.status, "be deleted");
      }
      await ensureNotMain(data.id);
      onDelete?.(data.id);
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          return session.adapter.delete(remoteId);
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "deleted"),
      });
    },
    [ensureNotMain, onDelete, session, store],
  );

  const generateTitle = useCallback(
    async (
      threadIdOrRemoteId: string,
      messages: readonly ThreadMessage[] | undefined,
    ) => {
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) {
        throw threadNotFoundError(threadIdOrRemoteId, "generating its title");
      }
      if (data.status === "new") {
        throw threadStatusError(
          threadIdOrRemoteId,
          data.status,
          "generate a title",
        );
      }
      const { remoteId } = await data.initializeTask;
      if (!isSameThread(store.value, data.id, session.mainThreadId)) return;
      if (!messages) return;
      const stream = await session.adapter.generateTitle(remoteId, messages);
      await applyTitleStream(stream, (newTitle) => {
        const state = store.baseValue;
        const current = getThreadData(state, data.id);
        if (!current) return;
        store.update({
          ...state,
          threadData: {
            ...state.threadData,
            [current.id]: {
              ...current,
              title: newTitle,
            },
          },
        });
      });
    },
    [session, store],
  );

  const { mainThreadClient, itemOrder, threadListItems } =
    useRemoteThreadListView({
      listState,
      mainThreadId,
      threadFactory,
      useAdapters: adapter.unstable_useAdapters,
      onSwitchTo: (id, options) => switchToThread(id, options),
      onRename: (id, title) => rename(id, title),
      onUpdateCustom: (id, custom) => updateCustom(id, custom),
      onArchive: (id) => archive(id),
      onUnarchive: (id) => unarchive(id),
      onDelete: (id) => deleteThread(id),
      onGenerateTitle: (id, messages) => generateTitle(id, messages),
      onInitialize: async (id) => toInitializeResult(await initialize(id)),
      onDetach: (id) => ensureNotMain(id),
    });

  const mainRemoteId = getThreadData(listState, mainThreadId)?.remoteId;
  useEffect(() => {
    if (session.lastNotifiedRemoteId === mainRemoteId) return;
    session.lastNotifiedRemoteId = mainRemoteId;
    onThreadIdChange?.(mainRemoteId);
  }, [mainRemoteId, onThreadIdChange, session]);

  useEffect(() => {
    if (session.isFirstThreadIdEffect) {
      session.isFirstThreadIdEffect = false;
      session.lastControlledThreadId = threadId;
      if (threadId === undefined) return;
      handleThreadListAction("switch", () =>
        switchToThread(threadId, undefined, false),
      );
      return;
    }
    if (Object.is(session.lastControlledThreadId, threadId)) return;
    session.lastControlledThreadId = threadId;
    if (threadId === undefined) {
      handleThreadListAction("create", () => switchToNewThread(false));
      return;
    }
    handleThreadListAction("switch", () =>
      switchToThread(threadId, undefined, false),
    );
  }, [session, switchToNewThread, switchToThread, threadId]);

  const state = useMemo(
    () => ({
      mainThreadId,
      newThreadId: listState.newThreadId ?? null,
      isLoading: listState.isLoading,
      isLoadingMore: listState.isLoadingMore,
      hasMore: listState.cursor !== undefined,
      threadIds: listState.threadIds,
      archivedThreadIds: listState.archivedThreadIds,
      threadItems: threadListItems.state,
      main: mainThreadClient.state,
    }),
    [
      listState.archivedThreadIds,
      listState.cursor,
      listState.isLoading,
      listState.isLoadingMore,
      listState.newThreadId,
      listState.threadIds,
      mainThreadClient.state,
      mainThreadId,
      threadListItems.state,
    ],
  );

  return {
    getState: () => state,
    switchToThread: (id, options) => {
      handleThreadListAction("switch", () => switchToThread(id, options));
    },
    switchToNewThread: () => {
      handleThreadListAction("create", () => switchToNewThread());
    },
    getLoadThreadsPromise,
    reload,
    reloadMainThread: () => {
      if (getThreadData(store.value, mainThreadId)?.status === "new") {
        return RESOLVED_PROMISE;
      }
      return (
        mainThreadClient.methods.unstable_refetchThread?.() ?? RESOLVED_PROMISE
      );
    },
    loadMore,
    item: (selector) => {
      if (selector === "main") {
        const index = itemOrder.findIndex((item) =>
          itemMatchesId(item, listState, mainThreadId),
        );
        return threadListItems.get({ index });
      }
      if ("id" in selector) {
        const index = itemOrder.findIndex((item) =>
          itemMatchesId(item, listState, selector.id),
        );
        return threadListItems.get({ index });
      }
      const ids = selector.archived
        ? listState.archivedThreadIds
        : listState.threadIds;
      const id = ids[selector.index];
      if (id === undefined) {
        return threadListItems.get({ index: -1 });
      }
      const index = itemOrder.findIndex((item) =>
        itemMatchesId(item, listState, id),
      );
      return threadListItems.get({ index });
    },
    thread: () => mainThreadClient.methods,
  };
};

/**
 * `AuiConfig` `threads` entry backed by a `RemoteThreadListAdapter`. Thread
 * bodies are born from the `thread` factory inside the client tree, so any
 * `AssistantClient` host can run a remote or cloud list. Per-thread history
 * and attachments come from `unstable_useAdapters`. `useRemoteThreadListRuntime`
 * uses the same hook when `unstable_Provider` is omitted. Key the factory
 * with `withKey` so history reloads when the visible thread changes.
 */
export const RemoteThreadList = resource(useRemoteThreadList);

attachTransformScopes(useRemoteThreadList, inMemoryThreadListTransformScopes);
