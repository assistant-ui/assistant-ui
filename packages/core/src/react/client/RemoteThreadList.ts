import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { useThreadSelectionEvents } from "../../store/internal";
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
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import type { ThreadMessage } from "../../types/message";
import { AssistantMessageStream } from "assistant-stream";
import {
  inMemoryThreadListTransformScopes,
  type InMemoryThreadListProps,
} from "./InMemoryThreadList";

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
  adapter: RemoteThreadListAdapter;
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
    detach: () => {},
  };
};

const ThreadListItemClient = resource(useThreadListItemClient);

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

  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const [{ store, initialMainId }] = useState(() => {
    const seeded = seedNewThread(EMPTY_LIST);
    return {
      store: new OptimisticState(seeded.state),
      initialMainId: seeded.id,
    };
  });

  const listState = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.value,
    () => store.value,
  );

  const [mainThreadId, setMainThreadId] = useState(initialMainId);
  useThreadSelectionEvents(mainThreadId);

  const loadGenerationRef = useRef(0);
  const loadPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const loadMorePromiseRef = useRef<Promise<void> | undefined>(undefined);
  const skipThreadIdNotifyRef = useRef(false);
  const lastNotifiedRemoteIdRef = useRef<string | undefined>(undefined);
  const mainThreadIdRef = useRef(mainThreadId);
  mainThreadIdRef.current = mainThreadId;

  const notifyRemoteId = useCallback(
    (remoteId: string | undefined, emit: boolean) => {
      if (lastNotifiedRemoteIdRef.current === remoteId) return;
      lastNotifiedRemoteIdRef.current = remoteId;
      if (emit) onThreadIdChange?.(remoteId);
    },
    [onThreadIdChange],
  );

  const getLoadThreadsPromise = useCallback(() => {
    if (loadPromiseRef.current) return loadPromiseRef.current;
    const generation = loadGenerationRef.current;
    loadPromiseRef.current = store
      .optimisticUpdate({
        execute: () => adapterRef.current.list(),
        loading: (state) => ({ ...state, isLoading: true }),
        then: (state, page) => {
          if (generation !== loadGenerationRef.current) return state;
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
        if (generation !== loadGenerationRef.current) return;
        console.error("[assistant-ui] thread list load failed:", error);
        loadPromiseRef.current = undefined;
        store.update({
          ...store.baseValue,
          isLoading: false,
        });
      })
      .then(() => {});
    return loadPromiseRef.current;
  }, [store]);

  const reload = useCallback(() => {
    loadGenerationRef.current++;
    loadPromiseRef.current = undefined;
    loadMorePromiseRef.current = undefined;
    store.update({
      ...store.baseValue,
      cursor: undefined,
    });
    return getLoadThreadsPromise();
  }, [getLoadThreadsPromise, store]);

  useEffect(() => {
    void getLoadThreadsPromise();
  }, [getLoadThreadsPromise]);

  const prevAdapterRef = useRef(adapter);
  useEffect(() => {
    if (prevAdapterRef.current === adapter) return;
    prevAdapterRef.current = adapter;
    void reload();
  }, [adapter, reload]);

  const loadMore = useCallback(() => {
    if (loadMorePromiseRef.current) return loadMorePromiseRef.current;
    const snapshot = store.value;
    if (snapshot.cursor === undefined || snapshot.isLoading) {
      return RESOLVED_PROMISE;
    }
    const generation = loadGenerationRef.current;
    const cursor = snapshot.cursor;
    const currentAdapter = adapterRef.current;
    const task = store
      .optimisticUpdate({
        execute: () => currentAdapter.list({ after: cursor }),
        loading: (state) => ({ ...state, isLoadingMore: true }),
        then: (state, page) => {
          if (generation !== loadGenerationRef.current) return state;
          if (currentAdapter !== adapterRef.current) return state;
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
        if (loadMorePromiseRef.current === task) {
          loadMorePromiseRef.current = undefined;
        }
      });
    loadMorePromiseRef.current = task;
    return task;
  }, [store]);

  const switchToThread = useCallback(
    async (
      threadIdOrRemoteId: string,
      options?: { unarchive?: boolean },
      emitThreadIdChange = true,
    ) => {
      let data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) {
        const remoteMetadata =
          await adapterRef.current.fetch(threadIdOrRemoteId);
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
      if (data.status === "archived" && options?.unarchive !== false) {
        const { remoteId } = await data.initializeTask;
        await store.optimisticUpdate({
          execute: () => adapterRef.current.unarchive(remoteId),
          optimistic: (state) => updateStatusReducer(state, data.id, "regular"),
        });
        data = getThreadData(store.value, data.id) ?? data;
      }
      if (!emitThreadIdChange) skipThreadIdNotifyRef.current = true;
      setMainThreadId(data.id);
      notifyRemoteId(data.remoteId, emitThreadIdChange);
      onSwitchToThread?.(data.id);
    },
    [notifyRemoteId, onSwitchToThread, store],
  );

  const switchToNewThread = useCallback(
    (emitThreadIdChange = true) => {
      const existing = store.value.newThreadId;
      if (existing !== undefined) {
        if (!emitThreadIdChange) skipThreadIdNotifyRef.current = true;
        setMainThreadId(getThreadData(store.value, existing)?.id ?? existing);
        notifyRemoteId(undefined, emitThreadIdChange);
        onSwitchToNewThread?.();
        return;
      }
      const seeded = seedNewThread(store.value);
      store.update(seeded.state);
      if (!emitThreadIdChange) skipThreadIdNotifyRef.current = true;
      setMainThreadId(seeded.id);
      notifyRemoteId(undefined, emitThreadIdChange);
      onSwitchToNewThread?.();
    },
    [notifyRemoteId, onSwitchToNewThread, store],
  );

  const ensureNotMain = useCallback(
    (threadId: string) => {
      if (threadId !== mainThreadId) return;
      switchToNewThread();
    },
    [mainThreadId, switchToNewThread],
  );

  const initialize = useCallback(
    async (threadId: string) => {
      if (store.value.newThreadId !== threadId) {
        const data = getThreadData(store.value, threadId);
        if (!data) throw threadNotFoundError(threadId, "initializing it");
        if (data.status === "new") {
          throw threadStatusError(threadId, data.status, "be initialized here");
        }
        return data.initializeTask;
      }
      const result = await store.optimisticUpdate({
        execute: () => adapterRef.current.initialize(threadId),
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
      if (threadId === mainThreadIdRef.current) {
        notifyRemoteId(result.remoteId, true);
      }
      return result;
    },
    [notifyRemoteId, store],
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
          return adapterRef.current.rename(remoteId, newTitle);
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
    [store],
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
      if (!adapterRef.current.updateCustom) {
        throw new Error(
          "Remote thread list adapter does not support updating custom metadata",
        );
      }
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          const currentAdapter = adapterRef.current;
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
    [store],
  );

  const archive = useCallback(
    async (threadIdOrRemoteId: string) => {
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) throw threadNotFoundError(threadIdOrRemoteId, "archiving it");
      if (data.status !== "regular") {
        throw threadStatusError(threadIdOrRemoteId, data.status, "be archived");
      }
      ensureNotMain(data.id);
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          return adapterRef.current.archive(remoteId);
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "archived"),
      });
    },
    [ensureNotMain, store],
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
          const { remoteId } = await data.initializeTask;
          return adapterRef.current.unarchive(remoteId);
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "regular"),
      });
    },
    [store],
  );

  const deleteThread = useCallback(
    async (threadIdOrRemoteId: string) => {
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) throw threadNotFoundError(threadIdOrRemoteId, "deleting it");
      if (data.status !== "regular" && data.status !== "archived") {
        throw threadStatusError(threadIdOrRemoteId, data.status, "be deleted");
      }
      ensureNotMain(data.id);
      onDelete?.(data.id);
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          return adapterRef.current.delete(remoteId);
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "deleted"),
      });
    },
    [ensureNotMain, onDelete, store],
  );

  const mainThreadClient = useClientResource(threadFactory(mainThreadId));

  const generateTitle = useCallback(
    async (threadIdOrRemoteId: string) => {
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
      if (data.id !== mainThreadId) return;
      const messages = mainThreadClient.state.messages as
        | readonly ThreadMessage[]
        | undefined;
      if (!messages) return;
      const stream = await adapterRef.current.generateTitle(remoteId, messages);
      const messageStream = AssistantMessageStream.fromAssistantStream(stream);
      for await (const result of messageStream) {
        const newTitle = result.parts.filter((c) => c.type === "text")[0]?.text;
        const state = store.baseValue;
        const current = getThreadData(state, data.id);
        if (!current) continue;
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
      }
    },
    [mainThreadClient.state.messages, mainThreadId, store],
  );

  const mainRemoteId = getThreadData(listState, mainThreadId)?.remoteId;
  useEffect(() => {
    if (lastNotifiedRemoteIdRef.current === mainRemoteId) return;
    lastNotifiedRemoteIdRef.current = mainRemoteId;
    if (skipThreadIdNotifyRef.current) {
      skipThreadIdNotifyRef.current = false;
      return;
    }
    onThreadIdChange?.(mainRemoteId);
  }, [mainRemoteId, onThreadIdChange]);

  const isFirstThreadIdEffectRef = useRef(true);
  useEffect(() => {
    if (isFirstThreadIdEffectRef.current) {
      isFirstThreadIdEffectRef.current = false;
      if (threadId === undefined) return;
      void switchToThread(threadId, undefined, false);
      return;
    }
    if (threadId === undefined) {
      switchToNewThread(false);
      return;
    }
    void switchToThread(threadId, undefined, false);
  }, [switchToNewThread, switchToThread, threadId]);

  const itemOrder = useMemo(() => {
    const ids = [
      listState.newThreadId,
      ...listState.threadIds,
      ...listState.archivedThreadIds,
    ].filter((id): id is string => id !== undefined);
    const seen = new Set<string>();
    const items: RemoteThreadData[] = [];
    for (const id of ids) {
      const data = getThreadData(listState, id);
      if (!data || seen.has(data.id)) continue;
      seen.add(data.id);
      items.push(data);
    }
    return items;
  }, [listState]);

  const threadListItems = useClientLookup(
    itemOrder.map((data) =>
      withKey(
        data.id,
        ThreadListItemClient({
          data,
          isRunning:
            data.id === mainThreadId && mainThreadClient.state.isRunning,
          onSwitchTo: (options) => {
            void switchToThread(data.id, options);
          },
          onRename: (title) => {
            void rename(data.id, title);
          },
          onUpdateCustom: (custom) => {
            void updateCustom(data.id, custom);
          },
          onArchive: () => {
            void archive(data.id);
          },
          onUnarchive: () => {
            void unarchive(data.id);
          },
          onDelete: () => {
            void deleteThread(data.id);
          },
          onGenerateTitle: () => {
            void generateTitle(data.id);
          },
          onInitialize: () => initialize(data.id),
        }),
      ),
    ),
  );

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
      void switchToThread(id, options);
    },
    switchToNewThread: () => {
      switchToNewThread();
    },
    getLoadThreadsPromise,
    reload,
    reloadMainThread: () =>
      mainThreadClient.methods.unstable_refetchThread?.() ?? RESOLVED_PROMISE,
    loadMore,
    item: (selector) => {
      if (selector === "main") {
        const index = itemOrder.findIndex((item) => item.id === mainThreadId);
        return threadListItems.get({ index: index === -1 ? 0 : index });
      }
      if ("id" in selector) {
        const data = getThreadData(listState, selector.id);
        const index = itemOrder.findIndex((item) => item.id === data?.id);
        return threadListItems.get({ index });
      }
      const ids = selector.archived
        ? listState.archivedThreadIds
        : listState.threadIds;
      const id = ids[selector.index];
      const data = id === undefined ? undefined : getThreadData(listState, id);
      const index = itemOrder.findIndex((item) => item.id === data?.id);
      return threadListItems.get({ index });
    },
    thread: () => mainThreadClient.methods,
  };
};

/**
 * `AuiConfig` `threads` entry backed by a `RemoteThreadListAdapter`. Thread
 * bodies are born from the `thread` factory inside the client tree, so any
 * `AssistantClient` host can run a remote or cloud list. `unstable_Provider`
 * is ignored; cloud history still goes through `useRemoteThreadListRuntime`.
 */
export const RemoteThreadList = resource(useRemoteThreadList);

attachTransformScopes(useRemoteThreadList, inMemoryThreadListTransformScopes);
