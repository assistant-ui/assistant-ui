import type {
  ThreadListRuntimeCore,
  ThreadListRuntimeEvent,
} from "../../runtime/interfaces/thread-list-runtime-core";
import {
  BaseSubscribable,
  WritableSubscribable,
} from "../../subscribable/subscribable";
import { useSubscribable } from "../../store/runtime-clients/useSubscribable";
import { nullProtoRecord } from "../../utils/record";
import { OptimisticState } from "../../runtimes/remote-thread-list/optimistic-state";
import { EMPTY_THREAD_CORE } from "../../runtimes/remote-thread-list/empty-thread-core";
import type {
  ClassifyAccumulator,
  RemoteThreadData,
  RemoteThreadState,
} from "../../runtimes/remote-thread-list/remote-thread-state";
import {
  classifyThreads,
  createEmptyRemoteThreadState,
  createThreadMappingId,
  getThreadData,
  normalizeCursor,
  updateStatusReducer,
  preserveMidLoadTransitions,
  seedNewThread,
  statusSnapshot,
} from "../../runtimes/remote-thread-list/remote-thread-state";
import type {
  RemoteThreadListAdapter,
  RemoteThreadListOptions,
  RemoteThreadMetadata,
} from "../../runtimes/remote-thread-list/types";
import { ThreadListAdapterChangedError } from "../../runtimes/remote-thread-list/adapter-changed";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";
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
import {
  type ComponentType,
  type FC,
  Fragment,
  type PropsWithChildren,
  useEffect,
  useId,
} from "react";
import { useAui } from "@assistant-ui/store";
import type { ModelContextProvider } from "../../model-context/types";
import { RuntimeAdapterProvider } from "./RuntimeAdapterProvider";
import { useStableRuntimeAdapters } from "./useRuntimeAdapters";

const threadNotFoundError = (threadIdOrRemoteId: string, action: string) =>
  new Error(`Thread "${threadIdOrRemoteId}" not found while ${action}.`);

const threadStatusError = (
  threadIdOrRemoteId: string,
  status: RemoteThreadData["status"],
  action: string,
) =>
  new Error(
    `Thread "${threadIdOrRemoteId}" has status "${status}", so it cannot ${action}.`,
  );

const EMPTY_REMOTE_STATE = createEmptyRemoteThreadState();

export class RemoteThreadListThreadListRuntimeCore
  extends BaseSubscribable
  implements ThreadListRuntimeCore
{
  private _options!: RemoteThreadListOptions;
  private readonly _hookManager: RemoteThreadListHookInstanceManager;
  private readonly _runtimeAdapters: { modelContext: ModelContextProvider };

  private _loadThreadsPromise: Promise<void> | undefined;
  private _loadMorePromise: Promise<void> | undefined;
  private _loadGeneration = 0;
  private _adapterGeneration = 0;
  private _replaceListOnNextLoad = false;
  private _staleThreadIdsOnReplace: ReadonlySet<string> | undefined;
  private _switchGeneration = 0;
  private _switchTask: Promise<void> | undefined;
  private readonly _titleStates = new Map<string, ThreadTitleState>();

  private _mainThreadId!: string;
  private readonly _state = new OptimisticState<RemoteThreadState>(
    EMPTY_REMOTE_STATE,
  );

  private readonly _useAdaptersProvider: FC<PropsWithChildren> = ({
    children,
  }) => {
    const useAdapters = this._options.adapter.unstable_useAdapters;
    if (useAdapters === undefined) return children;
    return (
      <this._SynthesizedAdapters useAdapters={useAdapters}>
        {children}
      </this._SynthesizedAdapters>
    );
  };

  private readonly _SynthesizedAdapters: FC<
    PropsWithChildren<{
      useAdapters: NonNullable<RemoteThreadListAdapter["unstable_useAdapters"]>;
    }>
  > = ({ useAdapters, children }) => {
    const adapters = useStableRuntimeAdapters(useAdapters());
    if (adapters == null) return children;
    return (
      <RuntimeAdapterProvider adapters={adapters}>
        {children}
      </RuntimeAdapterProvider>
    );
  };

  private resolveProvider(
    adapter: RemoteThreadListAdapter,
  ): ComponentType<PropsWithChildren> {
    if (adapter.unstable_Provider !== undefined) {
      return adapter.unstable_Provider as ComponentType<PropsWithChildren>;
    }
    if (adapter.unstable_useAdapters === undefined) return Fragment;
    return this._useAdaptersProvider;
  }

  public get threadItems() {
    return this._state.value.threadData;
  }

  public getLoadThreadsPromise() {
    // TODO this needs to be cached in case this promise is loaded during suspense
    if (!this._loadThreadsPromise) {
      const generation = this._loadGeneration;
      let replacedList = false;
      const statusAtRequest = statusSnapshot(this._state.baseValue);
      this._loadThreadsPromise = this._state
        .optimisticUpdate({
          execute: () => this._options.adapter.list(),
          loading: (state) => {
            if (generation !== this._loadGeneration) return state;
            return {
              ...state,
              isLoading: true,
              loadError: undefined,
            };
          },
          then: (state, l) => {
            if (generation !== this._loadGeneration) return state;
            const replaceList = this._replaceListOnNextLoad;
            if (replaceList) {
              this._replaceListOnNextLoad = false;
              replacedList = true;
              return this._replaceWithThreads(
                { ...state, loadError: undefined },
                l.threads,
                normalizeCursor(l.nextCursor),
              );
            }

            const fresh = classifyThreads(l.threads, {
              threadIds: [],
              archivedThreadIds: [],
              threadIdMap: { ...state.threadIdMap },
              threadData: { ...state.threadData },
            });
            const merged = {
              ...state,
              isLoading: false,
              loadError: undefined,
              cursor: normalizeCursor(l.nextCursor),
              threadIds: fresh.threadIds,
              archivedThreadIds: fresh.archivedThreadIds,
              threadIdMap: fresh.threadIdMap,
              threadData: fresh.threadData,
            };
            return preserveMidLoadTransitions(merged, state, statusAtRequest);
          },
        })
        .catch((error: unknown) => {
          if (generation !== this._loadGeneration) return;
          console.error("[assistant-ui] thread list load failed:", error);
          this._loadThreadsPromise = undefined;
          if (!this._replaceListOnNextLoad) {
            this._state.update({
              ...this._state.baseValue,
              isLoading: false,
              loadError: error,
            });
            return;
          }
          this._replaceListOnNextLoad = false;
          replacedList = true;
          this._state.update(
            this._replaceWithThreads(
              { ...this._state.baseValue, loadError: error },
              [],
              undefined,
            ),
          );
        })
        .then(() => {
          if (!replacedList) return;
          const threadId = this._options.threadId;
          if (threadId === undefined) return;
          if (this.getItemById(threadId)?.id === this._mainThreadId) return;
          this._switchToThreadFromProp(threadId).catch(() => {});
        });
    }

    return this._loadThreadsPromise;
  }

  public loadMore(): Promise<void> {
    if (this._loadMorePromise) return this._loadMorePromise;

    const initialState = this._state.value;
    if (initialState.cursor === undefined || initialState.isLoading) {
      return Promise.resolve();
    }

    const generation = this._loadGeneration;
    const adapter = this._options.adapter;
    const cursor = initialState.cursor;

    const dedup = this._state
      .optimisticUpdate({
        execute: () => adapter.list({ after: cursor }),
        loading: (state) => {
          if (generation !== this._loadGeneration) return state;
          return { ...state, isLoadingMore: true };
        },
        then: (state, l) => {
          if (generation !== this._loadGeneration) return state;
          if (adapter !== this._options.adapter) return state;

          const appended = classifyThreads(l.threads, {
            threadIds: [...state.threadIds],
            archivedThreadIds: [...state.archivedThreadIds],
            threadIdMap: { ...state.threadIdMap },
            threadData: { ...state.threadData },
          });

          return {
            ...state,
            isLoadingMore: false,
            cursor: normalizeCursor(l.nextCursor),
            threadIds: appended.threadIds,
            archivedThreadIds: appended.archivedThreadIds,
            threadIdMap: appended.threadIdMap,
            threadData: appended.threadData,
          };
        },
      })
      .catch((error: unknown) => {
        if (generation !== this._loadGeneration) return;
        console.error("[assistant-ui] thread list loadMore failed:", error);
      })
      .then(() => {
        if (this._loadMorePromise === dedup) {
          this._loadMorePromise = undefined;
        }
      });

    this._loadMorePromise = dedup;
    return dedup;
  }

  constructor(
    options: RemoteThreadListOptions,
    contextProvider: ModelContextProvider,
  ) {
    super();

    this._state.subscribe(() => {
      this._notifySubscribers();
      this._notifyThreadIdChange();
    });
    this._runtimeAdapters = { modelContext: contextProvider };
    this._hookManager = new RemoteThreadListHookInstanceManager(
      options.runtimeHook,
      this,
    );
    this._hookManager.__internal_setDefaultAdapters(this._runtimeAdapters);
    this._hookManager.__internal_subscribeRunningChanged(() =>
      this._notifySubscribers(),
    );
    this._hookManager.__internal_subscribeRuntimeReplaced(() => {
      // A republish can land during the thread resource's render, where a
      // synchronous notify would re-enter store consumers mid-render.
      queueMicrotask(() => this._notifySubscribers());
    });
    this.providerStore = new WritableSubscribable(
      this.resolveProvider(options.adapter),
    );
    this.__internal_setOptions(options);
    this.switchToNewThread();
  }

  private _initialThreadLoaded = false;
  private providerStore;

  public __internal_setOptions(options: RemoteThreadListOptions) {
    if (this._options === options) return;

    const adapterChanged =
      this._options !== undefined && this._options.adapter !== options.adapter;
    const controlledThreadIdChanged =
      this._initialThreadLoaded &&
      this._options !== undefined &&
      this._options.threadId !== options.threadId;

    this._options = options;

    this.providerStore.setState(this.resolveProvider(options.adapter));

    this._hookManager.setRuntimeHook(options.runtimeHook);

    if (adapterChanged) {
      this._loadGeneration++;
      this._adapterGeneration++;
      this._switchGeneration++;
      this._switchTask = undefined;
      this._loadThreadsPromise = undefined;
      this._loadMorePromise = undefined;
      this._replaceListOnNextLoad = true;
      this._staleThreadIdsOnReplace = new Set(
        Object.values(this._state.baseValue.threadData)
          .filter((item) => item.status !== "new")
          .map((item) => item.id),
      );
      this._state.update({
        ...this._state.baseValue,
        cursor: undefined,
        loadError: undefined,
      });
      this._titleStates.clear();
    }

    if (controlledThreadIdChanged) {
      this._switchToThreadFromProp(options.threadId).catch(() => {});
    }
  }

  private _requireAdapterGeneration(generation: number) {
    if (generation !== this._adapterGeneration) {
      throw new ThreadListAdapterChangedError();
    }
  }

  private _requireAdapterSettled() {
    if (this._replaceListOnNextLoad) {
      throw new ThreadListAdapterChangedError();
    }
  }

  private _replaceWithThreads(
    state: RemoteThreadState,
    threads: readonly RemoteThreadMetadata[],
    cursor: string | undefined,
  ): RemoteThreadState {
    const carried: RemoteThreadData[] = [];
    if (state.newThreadId) {
      const mappingId = Object.hasOwn(state.threadIdMap, state.newThreadId)
        ? state.threadIdMap[state.newThreadId]
        : undefined;
      const draft =
        mappingId && Object.hasOwn(state.threadData, mappingId)
          ? state.threadData[mappingId]
          : undefined;
      if (draft?.status === "new") carried.push(draft);
    }

    const stale = this._staleThreadIdsOnReplace;
    if (stale) {
      for (const item of Object.values(state.threadData)) {
        if (stale.has(item.id)) continue;
        if (item.status !== "new" && item.remoteId === undefined) continue;
        carried.push(item);
      }
    }
    this._staleThreadIdsOnReplace = undefined;

    const seed: ClassifyAccumulator = {
      threadIds: [],
      archivedThreadIds: [],
      threadIdMap: nullProtoRecord(),
      threadData: nullProtoRecord(),
    };
    for (const item of carried) {
      const mappingId = createThreadMappingId(item.id);
      if (Object.hasOwn(seed.threadData, mappingId)) continue;
      seed.threadIdMap[item.id] = mappingId;
      if (item.remoteId !== undefined) {
        seed.threadIdMap[item.remoteId] = mappingId;
      }
      seed.threadData[mappingId] = item;
    }

    const { threadIds, archivedThreadIds, threadIdMap, threadData } =
      classifyThreads(threads, seed);

    for (const item of carried) {
      if (item.remoteId === undefined) continue;
      const currentMappingId = createThreadMappingId(item.id);
      const current = Object.hasOwn(threadData, currentMappingId)
        ? threadData[currentMappingId]
        : undefined;
      if (current === undefined) continue;
      if (current.status === "regular" && !threadIds.includes(current.id)) {
        threadIds.push(current.id);
      } else if (
        current.status === "archived" &&
        !archivedThreadIds.includes(current.id)
      ) {
        archivedThreadIds.push(current.id);
      }
    }

    let nextState: RemoteThreadState = {
      ...state,
      isLoading: false,
      cursor,
      threadIds,
      archivedThreadIds,
      threadIdMap,
      threadData,
      newThreadId:
        state.newThreadId !== undefined &&
        !Object.hasOwn(threadIdMap, state.newThreadId)
          ? undefined
          : state.newThreadId,
    };

    if (getThreadData(nextState, this._mainThreadId) === undefined) {
      const preservedDraft = nextState.newThreadId;
      if (preservedDraft !== undefined) {
        this._mainThreadId = preservedDraft;
      } else {
        const seeded = seedNewThread(nextState);
        this._mainThreadId = seeded.id;
        nextState = seeded.state;
      }
      if (this._options.threadId === undefined) {
        this._notifyThreadIdChange();
      } else {
        this._lastNotifiedThreadId = undefined;
      }
    }

    const nextIds = new Set(
      Object.values(nextState.threadData).map((item) => item.id),
    );
    for (const item of Object.values(state.threadData)) {
      if (!nextIds.has(item.id)) {
        this._hookManager.stopThreadRuntime(item.id);
      }
    }
    void this._hookManager.startThreadRuntime(this._mainThreadId).then(
      () => this._notifySubscribers(),
      () => undefined,
    );

    return nextState;
  }

  public __internal_load() {
    this.getLoadThreadsPromise(); // begin loading on initial bind
    if (this._initialThreadLoaded) return;
    this._initialThreadLoaded = true;

    const startThreadId =
      this._options.threadId ?? this._options.initialThreadId;
    if (startThreadId !== undefined) {
      const switchTask =
        this._options.threadId !== undefined
          ? this._switchToThreadFromProp(startThreadId)
          : this.switchToThread(startThreadId);
      switchTask.catch(() => {});
    }
  }

  public async reloadMainThread(): Promise<void> {
    const threadId = this._mainThreadId;
    if (threadId === undefined) return;

    // An unsent thread holds no remote state, so a refetch would only discard
    // what the user has typed.
    if (this.getItemById(threadId)?.status === "new") return;

    const runtimeCore = this._hookManager.getThreadRuntimeCore(threadId);

    try {
      if (runtimeCore?.unstable_refetchThread) {
        // Called on the core so class-method implementations keep `this`.
        await runtimeCore.unstable_refetchThread();
      } else {
        await this._hookManager.__internal_restartThreadRuntime(threadId);
      }
    } catch (error) {
      // delete and detach switch the main thread away before stopping the
      // runtime, so a rejection once that has happened belongs to them.
      if (threadId !== this._mainThreadId) return;
      throw error;
    }

    if (threadId !== this._mainThreadId) return;
    this._notifySubscribers();
  }

  public reload() {
    this._loadGeneration++;
    this._loadThreadsPromise = undefined;
    this._loadMorePromise = undefined;
    this._state.update({
      ...this._state.baseValue,
      cursor: undefined,
    });
    return this.getLoadThreadsPromise();
  }

  public get isLoading() {
    return this._state.value.isLoading;
  }

  public get loadError() {
    return this._state.value.loadError;
  }

  public get isLoadingMore() {
    return this._state.value.isLoadingMore;
  }

  public get hasMore() {
    return this._state.value.cursor !== undefined;
  }

  public get threadIds() {
    return this._state.value.threadIds;
  }

  public get archivedThreadIds() {
    return this._state.value.archivedThreadIds;
  }

  public get newThreadId() {
    return this._state.value.newThreadId;
  }

  public get mainThreadId(): string {
    return this._mainThreadId;
  }

  // The settled remote ID of the active thread, or undefined while it is still
  // a new/optimistic thread. This is the value surfaced to `onThreadIdChange`.
  private get _mainThreadRemoteId(): string | undefined {
    if (this._mainThreadId === undefined) return undefined;
    return getThreadData(this._state.value, this._mainThreadId)?.remoteId;
  }

  private _lastNotifiedThreadId: string | undefined = undefined;

  private _notifyThreadIdChange(emit = true) {
    const threadId = this._mainThreadRemoteId;
    if (this._lastNotifiedThreadId === threadId) return;
    this._lastNotifiedThreadId = threadId;
    if (emit) {
      this._options.onThreadIdChange?.(threadId);
    }
  }

  public getMainThreadRuntimeCore() {
    const result = this._hookManager.getThreadRuntimeCore(this._mainThreadId);
    if (!result) return EMPTY_THREAD_CORE;
    return result;
  }

  public getThreadRuntimeCore(threadIdOrRemoteId: string) {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data)
      throw threadNotFoundError(threadIdOrRemoteId, "getting its runtime");

    const result = this._hookManager.getThreadRuntimeCore(data.id);
    if (!result)
      throw new Error(
        `Runtime for thread "${threadIdOrRemoteId}" not found while getting its runtime.`,
      );
    return result;
  }

  public unstable_isThreadRunning(threadIdOrRemoteId: string) {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) return false;
    return this._hookManager.__internal_isThreadRunning(data.id);
  }

  public unstable_subscribeThreadEvents(
    callback: (event: ThreadListRuntimeEvent) => void,
  ) {
    return this._hookManager.__internal_subscribeThreadEvents(callback);
  }

  public getItemById(threadIdOrRemoteId: string) {
    return getThreadData(this._state.value, threadIdOrRemoteId);
  }

  public switchToThread(
    threadIdOrRemoteId: string,
    options?: { unarchive?: boolean },
  ): Promise<void> {
    return this._startSwitchToThread(threadIdOrRemoteId, options, true);
  }

  private _startSwitchToThread(
    threadIdOrRemoteId: string,
    options: { unarchive?: boolean } | undefined,
    emitThreadIdChange: boolean,
  ): Promise<void> {
    const generation = ++this._switchGeneration;
    const task = this._switchToThread(
      threadIdOrRemoteId,
      options,
      generation,
      emitThreadIdChange,
    );
    this._switchTask = task;
    return task;
  }

  private async _switchToThread(
    threadIdOrRemoteId: string,
    options: { unarchive?: boolean } | undefined,
    generation: number,
    emitThreadIdChange: boolean,
  ): Promise<void> {
    if (
      this._replaceListOnNextLoad &&
      threadIdOrRemoteId !== this._state.value.newThreadId
    ) {
      throw new ThreadListAdapterChangedError();
    }
    let data = this.getItemById(threadIdOrRemoteId);

    if (!data) {
      const remoteMetadata =
        await this._options.adapter.fetch(threadIdOrRemoteId);
      if (generation !== this._switchGeneration) return;

      const state = this._state.value;
      const mappingId = createThreadMappingId(remoteMetadata.remoteId);

      const newThreadData = {
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
        } as RemoteThreadData,
      };

      const newThreadIdMap = {
        ...state.threadIdMap,
        [remoteMetadata.remoteId]: mappingId,
      };

      // A concurrent `list()` may already have placed this thread; keep that
      // position and only merge metadata. A genuinely absent thread stays
      // appended: it may live on an unloaded page, and a prepend would pin it
      // above newer threads permanently. Filtering both arrays first still
      // prevents duplication or a wrong-status entry from `list()`.
      const remoteId = remoteMetadata.remoteId;
      const wasInTarget =
        remoteMetadata.status === "regular"
          ? state.threadIds.includes(remoteId)
          : state.archivedThreadIds.includes(remoteId);

      const threadIdsWithoutRemote = state.threadIds.filter(
        (id) => id !== remoteId,
      );
      const archivedThreadIdsWithoutRemote = state.archivedThreadIds.filter(
        (id) => id !== remoteId,
      );

      const newThreadIds =
        remoteMetadata.status === "regular"
          ? wasInTarget
            ? state.threadIds
            : [...threadIdsWithoutRemote, remoteId]
          : threadIdsWithoutRemote;
      const newArchivedThreadIds =
        remoteMetadata.status === "archived"
          ? wasInTarget
            ? state.archivedThreadIds
            : [...archivedThreadIdsWithoutRemote, remoteId]
          : archivedThreadIdsWithoutRemote;

      this._state.update({
        ...state,
        threadIds: newThreadIds,
        archivedThreadIds: newArchivedThreadIds,
        threadIdMap: newThreadIdMap,
        threadData: newThreadData,
      });

      data = this.getItemById(threadIdOrRemoteId);
    }

    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "switching to it");
    if (this._mainThreadId === data.id) return;

    const task = this._hookManager.startThreadRuntime(data.id);
    if (this.mainThreadId !== undefined) {
      await task;
    } else {
      void task.then(
        () => this._notifySubscribers(),
        () => undefined,
      );
    }

    if (generation !== this._switchGeneration) return;

    let current = this.getItemById(data.id);
    if (current?.id !== data.id) return;

    if (current.status === "archived" && options?.unarchive !== false) {
      await current.initializeTask;
      if (generation !== this._switchGeneration) return;
      current = this.getItemById(data.id);
      if (current?.id !== data.id) return;
      if (current.status === "archived") {
        await this.unarchive(current.id);
        if (generation !== this._switchGeneration) return;
        current = this.getItemById(data.id);
        if (current?.id !== data.id) return;
      }
    }
    this._mainThreadId = current.id;

    this._notifySubscribers();
    this._notifyThreadIdChange(emitThreadIdChange);
  }

  public switchToNewThread(): Promise<void> {
    return this._startSwitchToNewThread(true);
  }

  private _switchToThreadFromProp(threadId: string | undefined): Promise<void> {
    return threadId !== undefined
      ? this._startSwitchToThread(threadId, undefined, false)
      : this._startSwitchToNewThread(false);
  }

  private _startSwitchToNewThread(emitThreadIdChange: boolean): Promise<void> {
    const generation = ++this._switchGeneration;
    const task = this._switchToNewThread(generation, emitThreadIdChange);
    this._switchTask = task;
    return task;
  }

  private async _switchToNewThread(
    generation: number,
    emitThreadIdChange: boolean,
  ): Promise<void> {
    // an initialization transaction is in progress, wait for it to settle
    while (
      this._state.baseValue.newThreadId !== undefined &&
      this._state.value.newThreadId === undefined
    ) {
      await this._state.waitForUpdate();
      if (generation !== this._switchGeneration) return;
    }

    const state = this._state.baseValue;
    let id: string | undefined = this._state.value.newThreadId;
    if (id === undefined) {
      const next = seedNewThread(state);
      id = next.id;
      this._state.update(next.state);
    }

    return this._switchToThread(id, undefined, generation, emitThreadIdChange);
  }

  public initialize = async (threadId: string) => {
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    if (this._state.value.newThreadId !== threadId) {
      this._requireAdapterSettled();
      const data = this.getItemById(threadId);
      if (!data) throw threadNotFoundError(threadId, "initializing it");
      if (data.status === "new")
        throw threadStatusError(threadId, data.status, "be initialized here");
      const { remoteId, externalId } = await data.initializeTask;
      this._requireAdapterGeneration(adapterGeneration);
      return { remoteId, externalId };
    }

    const { remoteId, externalId } = await this._state.optimisticUpdate({
      execute: () => {
        this._requireAdapterGeneration(adapterGeneration);
        return adapter.initialize(threadId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, threadId, "regular");
      },
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
        if (adapterGeneration !== this._adapterGeneration) return state;
        const data = getThreadData(state, threadId);
        if (!data) return state;

        const mappingId = createThreadMappingId(threadId);
        // A list() response that landed while this initialize was in flight
        // could not know the remote id yet, so it may have minted its own slot
        // for it; that slot collapses into this one.
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
    this._requireAdapterGeneration(adapterGeneration);
    return { remoteId, externalId };
  };

  public generateTitle = async (
    threadId: string,
    options?: { automatic?: boolean },
  ) => {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    const data = this.getItemById(threadId);
    if (!data) throw threadNotFoundError(threadId, "generating its title");
    if (data.status === "new")
      throw threadStatusError(threadId, data.status, "generate a title");

    const { remoteId } = await data.initializeTask;
    this._requireAdapterGeneration(adapterGeneration);

    const runtimeCore = this._hookManager.getThreadRuntimeCore(data.id);
    if (!runtimeCore) return; // thread is no longer running

    // Incomplete assistant turns (running status, possibly empty content)
    // would make the payload race-dependent; the title reads settled
    // messages only, matching the trigger's readiness gate.
    const messages = runtimeCore.messages.filter(isTitleSourceMessage);
    await runThreadTitleGeneration({
      states: this._titleStates,
      threadId: data.id,
      automatic: options?.automatic === true,
      generate: async (onTitle) => {
        const stream = await adapter.generateTitle(remoteId, messages);
        this._requireAdapterGeneration(adapterGeneration);
        await applyTitleStream(stream, onTitle);
      },
      rename: async (title) => {
        this._requireAdapterGeneration(adapterGeneration);
        await adapter.rename(remoteId, title);
      },
      applyTitle: async (title) => {
        await this._state.optimisticUpdate({
          execute: async () => {},
          optimistic: (state) => {
            if (adapterGeneration !== this._adapterGeneration) return state;
            const currentData = getThreadData(state, data.id);
            if (!currentData) return state;
            return {
              ...state,
              threadData: {
                ...state.threadData,
                [currentData.id]: {
                  ...currentData,
                  title,
                },
              },
            };
          },
        });
      },
    });
  };

  public async rename(
    threadIdOrRemoteId: string,
    newTitle: string,
  ): Promise<void> {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "renaming it");
    if (data.status === "new")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be renamed");

    const claim = startThreadTitleRename(this._titleStates, data.id, newTitle);
    try {
      const result = await this._state.optimisticUpdate({
        execute: async () => {
          const { remoteId } = await data.initializeTask;
          this._requireAdapterGeneration(adapterGeneration);
          return adapter.rename(remoteId, newTitle);
        },
        optimistic: (state) => {
          const currentData = getThreadData(state, threadIdOrRemoteId);
          if (!currentData) return state;

          return {
            ...state,
            threadData: {
              ...state.threadData,
              [currentData.id]: {
                ...currentData,
                title: newTitle,
              },
            },
          };
        },
      });
      finishThreadTitleRename(this._titleStates, data.id, claim, true);
      return result;
    } catch (error) {
      finishThreadTitleRename(this._titleStates, data.id, claim, false);
      throw error;
    }
  }

  public async updateCustom(
    threadIdOrRemoteId: string,
    custom: Record<string, unknown> | undefined,
  ): Promise<void> {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data)
      throw threadNotFoundError(
        threadIdOrRemoteId,
        "updating its custom metadata",
      );
    if (data.status === "new")
      throw threadStatusError(
        threadIdOrRemoteId,
        data.status,
        "update custom metadata",
      );

    if (!adapter.updateCustom) {
      throw new Error(
        "Remote thread list adapter does not support updating custom metadata",
      );
    }

    return this._state.optimisticUpdate({
      execute: async () => {
        const { remoteId } = await data.initializeTask;
        this._requireAdapterGeneration(adapterGeneration);
        if (!adapter.updateCustom) {
          throw new Error(
            "Remote thread list adapter does not support updating custom metadata",
          );
        }
        return adapter.updateCustom(remoteId, custom);
      },
      optimistic: (state) => {
        const data = getThreadData(state, threadIdOrRemoteId);
        if (!data) return state;

        return {
          ...state,
          threadData: {
            ...state.threadData,
            [data.id]: {
              ...data,
              custom,
            },
          },
        };
      },
    });
  }

  private async _ensureThreadIsNotMain(threadId: string) {
    if (threadId === this.newThreadId)
      throw new Error("Cannot ensure new thread is not main");

    let lastAwaitedTask: Promise<void> | undefined;

    while (threadId === this._mainThreadId) {
      let switchTask = this._switchTask;
      const startedFallback = !switchTask || switchTask === lastAwaitedTask;
      if (startedFallback) switchTask = this.switchToNewThread();
      lastAwaitedTask = switchTask;

      try {
        await switchTask;
      } catch (error) {
        if (startedFallback && this._switchTask === switchTask) {
          throw error;
        }
      }
    }
  }

  public async archive(threadIdOrRemoteId: string) {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "archiving it");
    if (data.status !== "regular")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be archived");

    await this._ensureThreadIsNotMain(data.id);
    this._requireAdapterGeneration(adapterGeneration);

    return this._state.optimisticUpdate({
      execute: async () => {
        const { remoteId } = await data.initializeTask;
        this._requireAdapterGeneration(adapterGeneration);
        return adapter.archive(remoteId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.id, "archived");
      },
    });
  }

  public async unarchive(threadIdOrRemoteId: string): Promise<void> {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "unarchiving it");
    if (data.status !== "archived")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be unarchived");

    return this._state.optimisticUpdate({
      execute: async () => {
        try {
          const { remoteId } = await data.initializeTask;
          this._requireAdapterGeneration(adapterGeneration);
          return await adapter.unarchive(remoteId);
        } catch (error) {
          if (adapterGeneration === this._adapterGeneration) {
            await this._ensureThreadIsNotMain(data.id);
          }
          throw error;
        }
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.id, "regular");
      },
    });
  }

  public async delete(threadIdOrRemoteId: string) {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "deleting it");
    if (data.status !== "regular" && data.status !== "archived")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be deleted");

    await this._ensureThreadIsNotMain(data.id);
    this._requireAdapterGeneration(adapterGeneration);
    const result = await this._state.optimisticUpdate({
      execute: async () => {
        const { remoteId } = await data.initializeTask;
        this._requireAdapterGeneration(adapterGeneration);
        return await adapter.delete(remoteId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.id, "deleted");
      },
    });
    // The optimistic layer survives an adapter swap, so a resolved deletion has
    // dropped the slot from `threadData`, where `_replaceWithThreads` would
    // otherwise have found it to stop.
    this._hookManager.stopThreadRuntime(data.id);
    clearThreadTitleState(this._titleStates, data.id);
    return result;
  }

  public __internal_dispose() {
    this._hookManager.__internal_dispose();
  }

  public async detach(threadIdOrRemoteId: string): Promise<void> {
    const adapterGeneration = this._adapterGeneration;
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "detaching it");
    if (data.status !== "regular" && data.status !== "archived")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be detached");

    await this._ensureThreadIsNotMain(data.id);
    this._requireAdapterGeneration(adapterGeneration);
    this._hookManager.stopThreadRuntime(data.id);
  }

  private boundIdsStore = new WritableSubscribable<readonly string[]>([]);

  public __internal_RenderComponent: FC = () => {
    const id = useId();
    useEffect(() => {
      this.boundIdsStore.setState([...this.boundIdsStore.getState(), id]);
      return () => {
        this.boundIdsStore.setState(
          this.boundIdsStore.getState().filter((i) => i !== id),
        );
      };
    }, [id]);

    const boundIds = useSubscribable(this.boundIdsStore);
    const Provider = useSubscribable(this.providerStore);
    const aui = useAui();
    const enabled = boundIds.length === 0 || boundIds[0] === id;

    return (
      enabled && (
        <RuntimeAdapterProvider adapters={this._runtimeAdapters}>
          <this._hookManager.__internal_RenderThreadRuntimes
            provider={Provider}
          />
          <this._hookManager.__internal_Host parentClient={aui} />
        </RuntimeAdapterProvider>
      )
    );
  };
}
