import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { resource, withKey, type ResourceElement } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import {
  attachTransformScopes,
  Derived,
  useAssistantContextProvider,
  useAssistantContextValue,
  useClientLookup,
  useClientResource,
  useConfiguredAui,
} from "@assistant-ui/store/client";
import { isDevelopment, useThreadSelectionEvents } from "../../store/internal";
import { OptimisticState } from "../../runtimes/remote-thread-list/optimistic-state";
import {
  classifyThreads,
  createEmptyRemoteThreadState,
  createThreadMappingId,
  getThreadData,
  normalizeCursor,
  updateStatusReducer,
  type RemoteThreadData,
  type RemoteThreadState,
  preserveMidLoadTransitions,
  seedNewThread,
  statusSnapshot,
} from "../../runtimes/remote-thread-list/remote-thread-state";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
} from "../../runtimes/remote-thread-list/types";
import { ThreadListAdapterChangedError } from "../../runtimes/remote-thread-list/adapter-changed";
import type { ThreadMessage } from "../../types/message";
import { handleThreadListAction } from "../../store/runtime-clients/handle-thread-list-action";
import { nullProtoRecord } from "../../utils/record";
import {
  inMemoryThreadListTransformScopes,
  type InMemoryThreadListProps,
} from "./InMemoryThreadList";
import { AdaptedRemoteThread } from "./AdaptedRemoteThread";
import {
  applyTitleStream,
  isTitleSourceMessage,
} from "../../runtimes/remote-thread-list/title";
import {
  clearThreadTitleState,
  finishThreadTitleRename,
  runThreadTitleGeneration,
  startThreadTitleRename,
  type ThreadTitleState,
} from "../../runtimes/remote-thread-list/title-generation";

const RESOLVED_PROMISE = Promise.resolve();

const EMPTY_LIST = createEmptyRemoteThreadState();

export type RemoteThreadListProps = {
  /**
   * Swapping this to a different backing store does not reload the list. Call `reload()` after a genuine swap. A recreated object for the same store is a no-op. `reload()` after a different adapter instance resets selection and cached records before loading.
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
  /** Called after the backing adapter successfully deletes the thread. */
  onDelete?: ((threadId: string) => void) | undefined;
  /**
   * Keeps every thread the session switched to mounted, so a run continues
   * after the user switches away, per-item `isRunning` reflects background
   * runs, and a freshly initialized thread generates its title automatically.
   * A body unmounts on delete, detach, or an adapter replacement (`reload()`
   * after swapping the adapter); visited threads otherwise stay mounted for
   * the client's lifetime. Each body reads its own thread through the ambient
   * `threadListItem` scope, and `unstable_useAdapters` runs once per mounted
   * body. Off (the default), only the visible thread is mounted and a switch
   * unmounts it. The mode is fixed at mount.
   */
  backgroundThreads?: boolean | undefined;
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

const useThreadListItemClient = (props: {
  data: RemoteThreadData;
  isRunning: boolean;
  onSwitchTo: (options?: { unarchive?: boolean }) => void;
  onRename: (title: string) => void;
  onUpdateCustom: (custom: Record<string, unknown> | undefined) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onGenerateTitle: (options?: { automatic?: boolean }) => void;
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

const useRemoteThreadBody = ({
  id,
  status,
  remoteId,
  item,
  thread,
}: {
  id: string;
  status: RemoteThreadData["status"];
  remoteId: string | undefined;
  item: (isRunning: boolean) => ResourceElement<ClientOutput<"threadListItem">>;
  thread: ResourceElement<ClientOutput<"thread">>;
}): ClientOutput<"thread"> => {
  const parent = useAssistantContextValue();
  const [isRunning, setIsRunning] = useState(false);
  // The item client is mounted inside the body and served to the subtree
  // through a Derived scope, which keeps the graft on the derived-only (no
  // nested client host) path; resolving `parent.threads` here instead would
  // read the threads scope during its own construction.
  const itemHandle = useClientResource(item(isRunning));
  const { client } = useConfiguredAui(parent, {
    threadListItem: Derived({
      source: "threads",
      query: { type: "id", id },
      get: () => itemHandle.methods,
    }),
  });
  // Auto-title arms only for a thread born "new" in this body's lifetime;
  // threads loaded or fetched from the adapter already carry their title. The
  // settled (non-optimistic) initialize is what writes remoteId, so its
  // arrival is the initialization signal.
  const bornNewRef = useRef(status === "new");
  const titleFiredRef = useRef(false);
  return useAssistantContextProvider(client, function useBoundRemoteBody() {
    const body = useClientResource(thread);
    const bodyRunning = body.state.isRunning === true;
    useEffect(() => {
      setIsRunning(bodyRunning);
    }, [bodyRunning]);
    const armed =
      bornNewRef.current && !titleFiredRef.current && remoteId !== undefined;
    const hasTitleSource =
      armed &&
      (
        body.state.messages as readonly {
          status?: { type: string } | undefined;
        }[]
      ).some(isTitleSourceMessage);
    useEffect(() => {
      if (!hasTitleSource || titleFiredRef.current) return;
      titleFiredRef.current = true;
      client.threadListItem.generateTitle({ automatic: true });
    }, [hasTitleSource]);
    return body.methods;
  });
};

const RemoteThreadBody = resource(useRemoteThreadBody);

// `thread("main")` keeps one identity across switches, like the single
// useClientResource slot it replaced: consumers (the ambient `thread` scope,
// captured clients) hold the facade while it delegates to whichever body is
// currently main. Publishing the target during commit keeps abandoned
// concurrent renders from changing the facade observed by committed consumers.
const useMainThreadFacade = (
  current: ClientOutput<"thread">,
): ClientOutput<"thread"> => {
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  const [facade] = useState(
    () =>
      new Proxy({} as ClientOutput<"thread">, {
        get: (_, prop) =>
          (currentRef.current as unknown as Record<PropertyKey, unknown>)[prop],
        has: (_, prop) => prop in (currentRef.current as object),
        ownKeys: () => Reflect.ownKeys(currentRef.current as object),
        getOwnPropertyDescriptor: (_, prop) =>
          Reflect.getOwnPropertyDescriptor(currentRef.current as object, prop),
      }),
  );
  return facade;
};

const useRemoteThreadListView = ({
  listState,
  mainThreadId,
  startedIds,
  backgroundThreads,
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
  startedIds: readonly string[];
  backgroundThreads: boolean;
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
    options?: { automatic?: boolean },
  ) => Promise<void>;
  onInitialize: (threadId: string) => Promise<{
    remoteId: string;
    externalId: string | undefined;
  }>;
  onDetach: (threadId: string) => Promise<void>;
}) => {
  const bodyIds = useMemo(() => {
    if (!backgroundThreads) return [mainThreadId];
    const seen = new Set<string>();
    const seenRemoteIds = new Set<string>();
    const ids: string[] = [];
    for (const id of startedIds) {
      const data = getThreadData(listState, id);
      if (!data || seen.has(data.id)) continue;
      if (data.remoteId !== undefined && seenRemoteIds.has(data.remoteId)) {
        continue;
      }
      seen.add(data.id);
      if (data.remoteId !== undefined) seenRemoteIds.add(data.remoteId);
      ids.push(data.id);
    }
    return ids;
  }, [backgroundThreads, listState, mainThreadId, startedIds]);

  const itemElementFor = (data: RemoteThreadData, isRunning: boolean) =>
    ThreadListItemClient({
      data,
      isRunning,
      onSwitchTo: (options) =>
        handleThreadListAction("switch", () => onSwitchTo(data.id, options)),
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
      onDelete: () => handleThreadListAction("delete", () => onDelete(data.id)),
      onGenerateTitle: (options) =>
        handleThreadListAction("generate title", () =>
          onGenerateTitle(
            data.id,
            (backgroundThreads
              ? bodyStateOf(data.id)?.messages
              : mainThreadClient.state.messages) as
              | readonly ThreadMessage[]
              | undefined,
            options,
          ),
        ),
      onInitialize: () => onInitialize(data.id),
      onDetach: () => handleThreadListAction("detach", () => onDetach(data.id)),
    });

  const bodies = useClientLookup(
    bodyIds.map((id) => {
      const made = threadFactory(id);
      // Background bodies never change occupant, so an unkeyed factory
      // element is keyed by the mapping id here; per-body history loads
      // without requiring the factory to key itself.
      const thread =
        backgroundThreads && made.key === undefined ? withKey(id, made) : made;
      const wrapped =
        useAdapters === undefined
          ? thread
          : AdaptedRemoteThread({
              useAdapters,
              thread,
            });
      const data = getThreadData(listState, id);
      const element =
        backgroundThreads && data !== undefined
          ? RemoteThreadBody({
              id,
              status: data.status,
              remoteId: data.remoteId,
              item: (isRunning) => itemElementFor(data, isRunning),
              thread: wrapped,
            })
          : wrapped;
      return withKey(backgroundThreads ? id : (made.key ?? "main"), element);
    }),
  );
  // A reload can remap a local thread id to its remote identity while the
  // body stays keyed by the original mapping id, so lookups fall back to
  // remote-identity matching.
  const bodyIndexOf = (id: string) => {
    const direct = bodyIds.indexOf(id);
    if (direct !== -1) return direct;
    return bodyIds.findIndex((bodyId) => isSameThread(listState, bodyId, id));
  };
  const bodyStateOf = (id: string) => {
    const index = bodyIndexOf(id);
    return index === -1 ? undefined : bodies.state[index];
  };
  const mainIndex = bodyIndexOf(mainThreadId);
  const mainThreadClient = {
    state: bodies.state[mainIndex]!,
    methods: useMainThreadFacade(bodies.get({ index: mainIndex })),
  };
  const itemOrder = useMemo(
    () => collectItemOrder(listState, mainThreadId),
    [listState, mainThreadId],
  );
  const threadListItems = useClientLookup(
    itemOrder.map((data) =>
      withKey(
        data.id,
        itemElementFor(
          data,
          backgroundThreads
            ? (bodyStateOf(data.id)?.isRunning ?? false)
            : itemMatchesId(data, listState, mainThreadId) &&
                mainThreadClient.state.isRunning,
        ),
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
        adapterAtLoad: adapter,
        adapterGeneration: 0,
        titleStates: new Map<string, ThreadTitleState>(),
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
  const [startedIds, setStartedIds] = useState<readonly string[]>([
    initialMainId,
  ]);
  const [backgroundThreads] = useState(props.backgroundThreads === true);
  const assignMainThreadId = useCallback(
    (id: string) => {
      session.mainThreadId = id;
      setMainThreadId(id);
      setStartedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [session],
  );
  useThreadSelectionEvents(mainThreadId);
  useEffect(() => {
    // Publishing after commit keeps imperative actions on the adapter the committed tree renders with; an abandoned render must not reach them.
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
    const adapter = session.adapter;
    const statusAtRequest = statusSnapshot(store.baseValue);
    session.loadPromise = store
      .optimisticUpdate({
        execute: () => adapter.list(),
        loading: (state) => {
          if (generation !== session.loadGeneration) return state;
          return { ...state, isLoading: true, loadError: undefined };
        },
        then: (state, page) => {
          if (generation !== session.loadGeneration) return state;
          session.adapterAtLoad = adapter;
          const fresh = classifyThreads(page.threads, {
            threadIds: [],
            archivedThreadIds: [],
            threadIdMap: { ...state.threadIdMap },
            threadData: { ...state.threadData },
          });
          const merged = {
            ...state,
            isLoading: false,
            loadError: undefined,
            cursor: normalizeCursor(page.nextCursor),
            threadIds: fresh.threadIds,
            archivedThreadIds: fresh.archivedThreadIds,
            threadIdMap: fresh.threadIdMap,
            threadData: fresh.threadData,
          };
          return preserveMidLoadTransitions(merged, state, statusAtRequest);
        },
      })
      .catch((error: unknown) => {
        if (generation !== session.loadGeneration) return;
        console.error("[assistant-ui] thread list load failed:", error);
        session.loadPromise = undefined;
        store.update({
          ...store.baseValue,
          isLoading: false,
          loadError: error,
        });
      })
      .then(() => {});
    return session.loadPromise;
  }, [session, store]);

  const reload = useCallback(() => {
    const adapterChanged = adapter !== session.adapterAtLoad;
    session.loadGeneration++;
    session.loadPromise = undefined;
    session.loadMorePromise = undefined;
    if (adapterChanged) {
      session.adapterGeneration++;
      session.titleStates.clear();
      session.switchGeneration++;
      session.switchTask = undefined;
      session.adapterAtLoad = adapter;
      const seeded = seedNewThread(EMPTY_LIST);
      store.reset({ ...seeded.state, isLoading: true });
      assignMainThreadId(seeded.id);
      setStartedIds([seeded.id]);
      notifyRemoteId(undefined, true);
    } else {
      store.update({
        ...store.baseValue,
        cursor: undefined,
      });
    }
    return getLoadThreadsPromise();
  }, [
    adapter,
    assignMainThreadId,
    getLoadThreadsPromise,
    notifyRemoteId,
    session,
    store,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const retryAfterError = () => {
      if (store.value.loadError !== undefined) void getLoadThreadsPromise();
    };
    const retryAfterVisible = () => {
      if (document.visibilityState === "visible") retryAfterError();
    };

    window.addEventListener("online", retryAfterError);
    document.addEventListener("visibilitychange", retryAfterVisible);
    return () => {
      window.removeEventListener("online", retryAfterError);
      document.removeEventListener("visibilitychange", retryAfterVisible);
    };
  }, [getLoadThreadsPromise, store]);

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
        loading: (state) => {
          if (generation !== session.loadGeneration) return state;
          return { ...state, isLoadingMore: true };
        },
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
        if (generation !== session.loadGeneration) return;
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

        const targetId = data.id;
        let current: RemoteThreadData | undefined = data;

        if (current.status === "archived" && options?.unarchive !== false) {
          const { remoteId } = await current.initializeTask;
          if (generation !== session.switchGeneration) return;
          current = getThreadData(store.value, targetId);
          if (current?.id !== targetId) return;
          if (current.status === "archived") {
            await store.optimisticUpdate({
              execute: () => session.adapter.unarchive(remoteId),
              optimistic: (state) =>
                updateStatusReducer(state, targetId, "regular"),
            });
            if (generation !== session.switchGeneration) return;
            current = getThreadData(store.value, targetId);
            if (current?.id !== targetId) return;
          }
        }
        if (generation !== session.switchGeneration) return;
        assignMainThreadId(current.id);
        notifyRemoteId(current.remoteId, emitThreadIdChange);
        session.onSwitchToThread?.(current.id);
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

  const requireAdapterGeneration = useCallback(
    (generation: number) => {
      if (generation !== session.adapterGeneration) {
        throw new ThreadListAdapterChangedError();
      }
    },
    [session],
  );

  const initialize = useCallback(
    async (threadId: string) => {
      const currentAdapter = session.adapter;
      const adapterGeneration = session.adapterGeneration;
      if (store.value.newThreadId !== threadId) {
        const data = getThreadData(store.value, threadId);
        if (!data) throw threadNotFoundError(threadId, "initializing it");
        if (data.status === "new") {
          throw threadStatusError(threadId, data.status, "be initialized here");
        }
        const result = toInitializeResult(await data.initializeTask);
        requireAdapterGeneration(adapterGeneration);
        return result;
      }
      const result = await store.optimisticUpdate({
        execute: () => {
          requireAdapterGeneration(adapterGeneration);
          return currentAdapter.initialize(threadId);
        },
        optimistic: (state) => updateStatusReducer(state, threadId, "regular"),
        loading: (state, task) => {
          const mappingId = createThreadMappingId(threadId);
          return {
            ...state,
            threadData: {
              ...state.threadData,
              [mappingId]: {
                ...(Object.hasOwn(state.threadData, mappingId)
                  ? state.threadData[mappingId]
                  : undefined),
                initializeTask: task,
              },
            },
          };
        },
        then: (state, { remoteId, externalId }) => {
          if (adapterGeneration !== session.adapterGeneration) return state;
          const data = getThreadData(state, threadId);
          if (!data) return state;
          const mappingId = createThreadMappingId(threadId);
          // A list() response that landed while this initialize was in flight
          // could not know the remote id yet, so it may have minted its own
          // slot for it; that slot collapses into this one.
          const listedMappingId = Object.hasOwn(state.threadIdMap, remoteId)
            ? state.threadIdMap[remoteId]
            : undefined;
          const orphan =
            listedMappingId !== undefined &&
            listedMappingId !== mappingId &&
            Object.hasOwn(state.threadData, listedMappingId)
              ? state.threadData[listedMappingId]
              : undefined;

          const threadData = nullProtoRecord(state.threadData);
          if (orphan !== undefined) delete threadData[listedMappingId!];
          threadData[mappingId] = {
            ...data,
            initializeTask: Promise.resolve({ remoteId, externalId }),
            remoteId,
            externalId,
          } as RemoteThreadData;

          const rewire = (ids: readonly string[]) =>
            orphan === undefined ? ids : ids.filter((id) => id !== orphan.id);

          return {
            ...state,
            threadIds: rewire(state.threadIds),
            archivedThreadIds: rewire(state.archivedThreadIds),
            threadIdMap: {
              ...state.threadIdMap,
              [remoteId]: mappingId,
            },
            threadData,
          };
        },
      });
      requireAdapterGeneration(adapterGeneration);
      if (threadId === session.mainThreadId) {
        notifyRemoteId(result.remoteId, true);
      }
      return toInitializeResult(result);
    },
    [notifyRemoteId, requireAdapterGeneration, session, store],
  );

  const rename = useCallback(
    (threadIdOrRemoteId: string, newTitle: string) => {
      const currentAdapter = session.adapter;
      const adapterGeneration = session.adapterGeneration;
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) throw threadNotFoundError(threadIdOrRemoteId, "renaming it");
      if (data.status === "new") {
        throw threadStatusError(threadIdOrRemoteId, data.status, "be renamed");
      }
      const claim = startThreadTitleRename(
        session.titleStates,
        data.id,
        newTitle,
      );
      return store
        .optimisticUpdate({
          execute: async () => {
            const { remoteId } = await data.initializeTask;
            requireAdapterGeneration(adapterGeneration);
            return currentAdapter.rename(remoteId, newTitle);
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
        })
        .then(
          (result) => {
            finishThreadTitleRename(session.titleStates, data.id, claim, true);
            return result;
          },
          (error: unknown) => {
            finishThreadTitleRename(session.titleStates, data.id, claim, false);
            throw error;
          },
        );
    },
    [requireAdapterGeneration, session, store],
  );

  const updateCustom = useCallback(
    (
      threadIdOrRemoteId: string,
      custom: Record<string, unknown> | undefined,
    ) => {
      const currentAdapter = session.adapter;
      const adapterGeneration = session.adapterGeneration;
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
      if (!currentAdapter.updateCustom) {
        throw new Error(
          "Remote thread list adapter does not support updating custom metadata",
        );
      }
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          requireAdapterGeneration(adapterGeneration);
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
    [requireAdapterGeneration, session, store],
  );

  const archive = useCallback(
    async (threadIdOrRemoteId: string) => {
      const currentAdapter = session.adapter;
      const adapterGeneration = session.adapterGeneration;
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) throw threadNotFoundError(threadIdOrRemoteId, "archiving it");
      if (data.status !== "regular") {
        throw threadStatusError(threadIdOrRemoteId, data.status, "be archived");
      }
      await ensureNotMain(data.id);
      requireAdapterGeneration(adapterGeneration);
      return store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          requireAdapterGeneration(adapterGeneration);
          return currentAdapter.archive(remoteId);
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "archived"),
      });
    },
    [ensureNotMain, requireAdapterGeneration, session, store],
  );

  const unarchive = useCallback(
    (threadIdOrRemoteId: string) => {
      const currentAdapter = session.adapter;
      const adapterGeneration = session.adapterGeneration;
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
            requireAdapterGeneration(adapterGeneration);
            return await currentAdapter.unarchive(remoteId);
          } catch (error) {
            if (adapterGeneration === session.adapterGeneration) {
              await ensureNotMain(data.id);
            }
            throw error;
          }
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "regular"),
      });
    },
    [ensureNotMain, requireAdapterGeneration, session, store],
  );

  const deleteThread = useCallback(
    async (threadIdOrRemoteId: string) => {
      const currentAdapter = session.adapter;
      const adapterGeneration = session.adapterGeneration;
      const data = getThreadData(store.value, threadIdOrRemoteId);
      if (!data) throw threadNotFoundError(threadIdOrRemoteId, "deleting it");
      if (data.status !== "regular" && data.status !== "archived") {
        throw threadStatusError(threadIdOrRemoteId, data.status, "be deleted");
      }
      await ensureNotMain(data.id);
      requireAdapterGeneration(adapterGeneration);
      const result = await store.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          requireAdapterGeneration(adapterGeneration);
          return currentAdapter.delete(remoteId);
        },
        optimistic: (state) => updateStatusReducer(state, data.id, "deleted"),
      });
      // An adapter swap resets the optimistic layer, and a listed thread's slot
      // id is its remote id, so a replacement adapter can re-list this slot
      // while the deletion is in flight.
      if (getThreadData(store.value, data.id) !== undefined) return result;
      clearThreadTitleState(session.titleStates, data.id);
      onDelete?.(data.id);
      return result;
    },
    [ensureNotMain, onDelete, requireAdapterGeneration, session, store],
  );

  const generateTitle = useCallback(
    async (
      threadIdOrRemoteId: string,
      messages: readonly ThreadMessage[] | undefined,
      options?: { automatic?: boolean },
    ) => {
      const currentAdapter = session.adapter;
      const adapterGeneration = session.adapterGeneration;
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
      requireAdapterGeneration(adapterGeneration);
      if (
        !backgroundThreads &&
        !isSameThread(store.value, data.id, session.mainThreadId)
      ) {
        return;
      }
      if (!messages) return;
      await runThreadTitleGeneration({
        states: session.titleStates,
        threadId: data.id,
        automatic: options?.automatic === true,
        generate: async (onTitle) => {
          const stream = await currentAdapter.generateTitle(remoteId, messages);
          requireAdapterGeneration(adapterGeneration);
          await applyTitleStream(stream, onTitle);
        },
        rename: async (title) => {
          requireAdapterGeneration(adapterGeneration);
          await currentAdapter.rename(remoteId, title);
        },
        applyTitle: async (title) => {
          await store.optimisticUpdate({
            execute: async () => {},
            optimistic: (state) => {
              if (adapterGeneration !== session.adapterGeneration) return state;
              const current = getThreadData(state, data.id);
              if (!current) return state;
              return {
                ...state,
                threadData: {
                  ...state.threadData,
                  [current.id]: {
                    ...current,
                    title,
                  },
                },
              };
            },
          });
        },
      });
    },
    [backgroundThreads, requireAdapterGeneration, session, store],
  );

  const detach = useCallback(
    async (threadId: string) => {
      await ensureNotMain(threadId);
      setStartedIds((prev) => prev.filter((id) => id !== threadId));
    },
    [ensureNotMain],
  );

  const { mainThreadClient, itemOrder, threadListItems } =
    useRemoteThreadListView({
      listState,
      mainThreadId,
      startedIds,
      backgroundThreads,
      threadFactory,
      useAdapters: adapter.unstable_useAdapters,
      onSwitchTo: (id, options) => switchToThread(id, options),
      onRename: (id, title) => rename(id, title),
      onUpdateCustom: (id, custom) => updateCustom(id, custom),
      onArchive: (id) => archive(id),
      onUnarchive: (id) => unarchive(id),
      onDelete: (id) => deleteThread(id),
      onGenerateTitle: (id, messages, options) =>
        generateTitle(id, messages, options),
      onInitialize: async (id) => toInitializeResult(await initialize(id)),
      onDetach: (id) => detach(id),
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
      loadError: listState.loadError,
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
      listState.loadError,
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
 * With `backgroundThreads`, every visited thread stays mounted: runs continue
 * across switches, per-item `isRunning` is live, and freshly initialized
 * threads title themselves.
 */
export const RemoteThreadList = resource(useRemoteThreadList);

attachTransformScopes(useRemoteThreadList, inMemoryThreadListTransformScopes);
