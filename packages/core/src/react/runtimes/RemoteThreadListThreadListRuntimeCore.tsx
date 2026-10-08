import type {
  ThreadListRuntimeCore,
  ThreadListRuntimeEvent,
} from "../../runtime/interfaces/thread-list-runtime-core";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadMessage } from "../../types/message";
import type { Unsubscribe } from "../../types/unsubscribe";
import {
  BaseSubscribable,
  WritableSubscribable,
} from "../../subscribable/subscribable";
import { isSilentRuntimeAction } from "../../utils/silent-runtime-action";
import { useSubscribable } from "../../store/runtime-clients/useSubscribable";
import { handleThreadListAction } from "../../store/runtime-clients/handle-thread-list-action";
import { nullProtoRecord } from "../../utils/record";
import { OptimisticState } from "../../runtimes/remote-thread-list/optimistic-state";
import { EMPTY_THREAD_CORE } from "../../runtimes/remote-thread-list/empty-thread-core";
import type {
  ClassifyAccumulator,
  RemoteThreadData,
  RemoteThreadState,
} from "../../runtimes/remote-thread-list/remote-thread-state";
import {
  applyInitialThreadPage,
  appendThreadPage,
  classifyThreads,
  createEmptyRemoteThreadState,
  createThreadMappingId,
  deleteThreadReducer,
  getThreadData,
  mergeFetchedThread,
  normalizeCursor,
  reconcileInitializedThread,
  promoteNewThreadReducer,
  updateStatusReducer,
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
import { invokeUserCallback } from "../../utils/invoke-user-callback";

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
  private readonly _automaticTitles = new Map<string, Unsubscribe>();
  private _disposed = false;

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

  private _exposedItems:
    | {
        state: RemoteThreadState;
        mainThreadId: string;
        ids: ReadonlySet<string>;
        items: RemoteThreadState["threadData"];
      }
    | undefined;

  // A reload that merges keeps the records of threads the list no longer
  // returns; items expose only listed threads, the draft and the main thread.
  private _getExposedItems() {
    const state = this._state.value;
    const cached = this._exposedItems;
    if (cached?.state === state && cached.mainThreadId === this._mainThreadId) {
      return cached;
    }
    const ids = new Set<string>();
    for (const id of [
      state.newThreadId,
      ...state.threadIds,
      ...state.archivedThreadIds,
      this._mainThreadId,
    ]) {
      if (id === undefined) continue;
      const data = getThreadData(state, id);
      if (data !== undefined) ids.add(data.id);
    }
    const entries = Object.entries(state.threadData);
    const items = entries.every(([, data]) => ids.has(data.id))
      ? state.threadData
      : nullProtoRecord(
          Object.fromEntries(entries.filter(([, data]) => ids.has(data.id))),
        );
    this._exposedItems = {
      state,
      mainThreadId: this._mainThreadId,
      ids,
      items,
    };
    return this._exposedItems;
  }

  public get threadItems() {
    return this._getExposedItems().items;
  }

  public getLoadThreadsPromise() {
    // TODO this needs to be cached in case this promise is loaded during suspense
    if (!this._loadThreadsPromise) {
      const generation = this._loadGeneration;
      const switchGeneration = this._switchGeneration;
      let replacedList = false;
      let appliedList = false;
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
            appliedList = true;
            if (replaceList) {
              this._replaceListOnNextLoad = false;
              replacedList = true;
              return this._replaceWithThreads(
                { ...state, loadError: undefined },
                l.threads,
                normalizeCursor(l.nextCursor),
              );
            }

            return applyInitialThreadPage(state, l, statusAtRequest);
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
          if (appliedList || replacedList)
            this._reapplyControlledThread(replacedList, switchGeneration);
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

    let appliedPage = false;
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
          appliedPage = true;

          return appendThreadPage(state, l);
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
        if (appliedPage) this._reapplyControlledThread(false);
      });

    this._loadMorePromise = dedup;
    return dedup;
  }

  // A controlled switch can fail before the list knows its thread; once a load
  // brings the thread in, it is applied again unless another switch has
  // started since.
  private _reapplyControlledThread(
    replacedList: boolean,
    switchGenerationAtLoad = this._switchGeneration,
  ) {
    const threadId = this._options.threadId;
    if (threadId === undefined) return;
    const data = this.getItemById(threadId);
    if (
      (replacedList &&
        switchGenerationAtLoad !== this._switchGeneration &&
        this._controlledSwitchGeneration !== this._switchGeneration) ||
      (!replacedList &&
        (data === undefined ||
          this._controlledSwitchGeneration !== this._switchGeneration))
    )
      return;
    if (data?.id === this._mainThreadId) return;
    this._switchToThreadFromProp(threadId).catch(() => {});
  }

  constructor(
    options: RemoteThreadListOptions,
    contextProvider: ModelContextProvider,
    initialThreadIdSeed?: string,
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
    this._startSwitchToNewThread(true, initialThreadIdSeed);
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
      this._disarmAutomaticTitles();
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
      if (nextIds.has(item.id)) continue;
      this._disarmAutomaticTitle(item.id);
      try {
        this._hookManager.stopThreadRuntime(item.id);
      } catch (error) {
        console.error(
          "[assistant-ui] Thread runtime cleanup threw while stopping a thread",
          error,
        );
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
      invokeUserCallback(
        "assistant-ui",
        "onThreadIdChange",
        this._options.onThreadIdChange,
        threadId,
      );
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

  private _getExposedItem(threadIdOrRemoteId: string) {
    const data = getThreadData(this._state.value, threadIdOrRemoteId);
    if (data === undefined || !this._getExposedItems().ids.has(data.id)) {
      return undefined;
    }
    return data;
  }

  public getItemById(threadIdOrRemoteId: string) {
    const data = getThreadData(this._state.value, threadIdOrRemoteId);
    if (data === undefined) return undefined;
    // A mounted thread runtime reads, titles and detaches its own item whether
    // or not it is listed. The other item actions use the exposed lookup.
    if (
      this._getExposedItems().ids.has(data.id) ||
      this._hookManager.__internal_hasThreadRuntime(data.id)
    ) {
      return data;
    }
    return undefined;
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
    let data = getThreadData(this._state.value, threadIdOrRemoteId);

    if (!data) {
      const adapter = this._options.adapter;
      // Merging as an optimistic transform replays operations that completed
      // while fetch() was in flight over the fetched, possibly older, snapshot.
      await this._state.optimisticUpdate({
        execute: () => adapter.fetch(threadIdOrRemoteId),
        then: (state, remoteMetadata) =>
          generation === this._switchGeneration
            ? mergeFetchedThread(state, remoteMetadata)
            : state,
      });
      if (generation !== this._switchGeneration) return;

      data = getThreadData(this._state.value, threadIdOrRemoteId);
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

    let current = getThreadData(this._state.value, data.id);
    if (current?.id !== data.id) return;

    if (current.status === "archived" && options?.unarchive !== false) {
      await current.initializeTask;
      if (generation !== this._switchGeneration) return;
      current = getThreadData(this._state.value, data.id);
      if (current?.id !== data.id) return;
      if (current.status === "archived") {
        await this._unarchive(current.id, current);
        if (generation !== this._switchGeneration) return;
        current = getThreadData(this._state.value, data.id);
        if (current?.id !== data.id) return;
      }
    }
    this._setMainThreadId(current.id);

    this._notifySubscribers();
    this._notifyThreadIdChange(emitThreadIdChange);
  }

  // A thread can be detached while a switch or initialize is about to select
  // it, so selecting a thread starts its runtime if it is not running.
  private _setMainThreadId(threadId: string) {
    this._mainThreadId = threadId;
    if (this._disposed || this._hookManager.getThreadRuntimeCore(threadId))
      return;
    const notify = () => this._notifySubscribers();
    void this._hookManager.startThreadRuntime(threadId).then(notify, notify);
  }

  public switchToNewThread(): Promise<void> {
    return this._startSwitchToNewThread(true);
  }

  private _controlledSwitchGeneration: number | undefined;

  private _switchToThreadFromProp(threadId: string | undefined): Promise<void> {
    const task =
      threadId !== undefined
        ? handleThreadListAction("switch", () =>
            this._startSwitchToThread(threadId, undefined, false),
          )
        : handleThreadListAction("create", () =>
            this._startSwitchToNewThread(false),
          );
    this._controlledSwitchGeneration = this._switchGeneration;
    return task;
  }

  private _startSwitchToNewThread(
    emitThreadIdChange: boolean,
    initialThreadIdSeed?: string,
  ): Promise<void> {
    const generation = ++this._switchGeneration;
    const task = this._switchToNewThread(
      generation,
      emitThreadIdChange,
      initialThreadIdSeed,
    );
    this._switchTask = task;
    return task;
  }

  private async _switchToNewThread(
    generation: number,
    emitThreadIdChange: boolean,
    initialThreadIdSeed?: string,
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
      const next = seedNewThread(state, initialThreadIdSeed);
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
      const data = this._getExposedItem(threadId);
      if (!data) throw threadNotFoundError(threadId, "initializing it");
      if (data.status === "new")
        throw threadStatusError(threadId, data.status, "be initialized here");
      const { remoteId, externalId } = await data.initializeTask;
      this._requireAdapterGeneration(adapterGeneration);
      return { remoteId, externalId };
    }

    this._requireAdapterGeneration(adapterGeneration);
    const initializeTask = adapter.initialize(threadId);
    let removedMappingId: string | undefined;
    const initialization = this._state.optimisticUpdate({
      execute: () => initializeTask,
      optimistic: (state) =>
        promoteNewThreadReducer(state, threadId, initializeTask),
      then: (state, { remoteId, externalId }) => {
        if (adapterGeneration !== this._adapterGeneration) return state;
        const reconciliation = reconcileInitializedThread(
          state,
          threadId,
          remoteId,
          externalId,
          threadId,
        );
        removedMappingId = reconciliation.removedMappingId;
        if (removedMappingId === this._mainThreadId) {
          this._setMainThreadId(reconciliation.survivorMappingId);
        }
        return reconciliation.state;
      },
    });
    this._armAutomaticTitle(threadId, initialization);
    const { remoteId, externalId } = await initialization.finally(() => {
      this._leaveRemovedMainThread(threadId).catch(() => {});
    });
    this._requireAdapterGeneration(adapterGeneration);
    if (removedMappingId !== undefined) {
      this._hookManager.stopThreadRuntime(removedMappingId);
    }
    return { remoteId, externalId };
  };

  // The thread runtime can restart before its first initialization settles,
  // so the automatic title is owed by the list and follows whichever runtime
  // is currently mounted for the thread.
  private _armAutomaticTitle(
    threadId: string,
    initialization: Promise<unknown>,
  ) {
    if (this._disposed) return;
    this._automaticTitles.get(threadId)?.();
    let runtime: ThreadRuntimeCore | undefined;
    let unsubscribeRuntime: Unsubscribe | undefined;
    let messages: readonly ThreadMessage[] = [];
    let initialized = false;
    let generating = false;
    let active = true;
    const check = () => {
      if (!active) return;
      const data = this.getItemById(threadId);
      if (!data) {
        this._disarmAutomaticTitle(threadId);
        return;
      }
      const current = this._hookManager.getThreadRuntimeCore(data.id);
      if (current !== runtime) {
        unsubscribeRuntime?.();
        runtime = current;
        unsubscribeRuntime = current?.subscribe(check);
      }
      const currentMessages = runtime?.messages.filter(isTitleSourceMessage);
      if (currentMessages?.length) messages = currentMessages;
      if (
        !initialized ||
        generating ||
        !runtime ||
        runtime.isLoading ||
        messages.length === 0
      )
        return;
      generating = true;
      this._generateTitle(threadId, { automatic: true }, () =>
        active ? messages : undefined,
      ).then(
        (claimed) => {
          generating = false;
          if (!active) return;
          if (claimed) this._disarmAutomaticTitle(threadId);
          else check();
        },
        (error: unknown) => {
          if (!active) return;
          this._disarmAutomaticTitle(threadId);
          if (isSilentRuntimeAction(error)) return;
          console.error("[assistant-ui] Thread title generation failed", error);
        },
      );
    };
    const unsubscribeManager = this._hookManager.subscribe(check);
    this._automaticTitles.set(threadId, () => {
      active = false;
      unsubscribeManager();
      unsubscribeRuntime?.();
    });
    void initialization.then(
      () => {
        initialized = true;
        check();
      },
      () => {
        if (active) this._disarmAutomaticTitle(threadId);
      },
    );
    check();
  }

  private _disarmAutomaticTitle(threadId: string) {
    this._automaticTitles.get(threadId)?.();
    this._automaticTitles.delete(threadId);
  }

  private _disarmAutomaticTitles() {
    for (const threadId of [...this._automaticTitles.keys()]) {
      this._disarmAutomaticTitle(threadId);
    }
  }

  public generateTitle = async (
    threadId: string,
    options?: { automatic?: boolean },
  ) => {
    await this._generateTitle(threadId, options);
  };

  private _generateTitle = async (
    threadId: string,
    options?: { automatic?: boolean },
    getAutomaticMessages?: () => readonly ThreadMessage[] | undefined,
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

    const automaticMessages = getAutomaticMessages?.();
    if (getAutomaticMessages && !automaticMessages) return false;
    const runtimeCore = this._hookManager.getThreadRuntimeCore(data.id);
    if (!runtimeCore) return false;
    if (getAutomaticMessages && runtimeCore.isLoading) return false;

    // Incomplete assistant turns (running status, possibly empty content)
    // would make the payload race-dependent; the title reads settled
    // messages only, matching the trigger's readiness gate.
    const currentMessages = runtimeCore.messages.filter(isTitleSourceMessage);
    const messages = currentMessages.length
      ? currentMessages
      : (automaticMessages ?? currentMessages);
    const isRemoved = () =>
      getThreadData(this._state.baseValue, data.id) === undefined;
    await runThreadTitleGeneration({
      states: this._titleStates,
      threadId: data.id,
      automatic: options?.automatic === true,
      generate: async (onTitle) => {
        if (isRemoved()) return;
        const stream = await adapter.generateTitle(remoteId, messages);
        this._requireAdapterGeneration(adapterGeneration);
        await applyTitleStream(stream, onTitle);
      },
      rename: async (title) => {
        this._requireAdapterGeneration(adapterGeneration);
        if (isRemoved()) return;
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
    return true;
  };

  public async rename(
    threadIdOrRemoteId: string,
    newTitle: string,
  ): Promise<void> {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    const data = this._getExposedItem(threadIdOrRemoteId);
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
    const data = this._getExposedItem(threadIdOrRemoteId);
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

  // A switch can land on the thread before the caller resumes, so callers
  // that act on the thread afterwards repeat this until it is still not main
  // in their own continuation.
  private async _ensureThreadIsNotMain(threadId: string) {
    if (threadId === this.newThreadId)
      throw new Error("Cannot ensure new thread is not main");

    let lastAwaitedTask: Promise<void> | undefined;

    while (this._isMainThread(threadId)) {
      // Rechecked each pass: the draft can become the new thread again
      // mid-loop when its failed first save rolls it back, and switching to a
      // new thread then re-adopts it, so no switch can move main off it.
      if (threadId === this.newThreadId)
        throw new Error("Cannot ensure new thread is not main");
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

  private _isMainThread(threadIdOrRemoteId: string) {
    const id = this.getItemById(threadIdOrRemoteId)?.id ?? threadIdOrRemoteId;
    return id === this._mainThreadId;
  }

  // Replaying an operation keyed by a listed duplicate can land on the thread
  // initialize() collapses it into, which may be the main thread.
  private async _leaveRemovedMainThread(settledThreadId: string) {
    const threadId = this._mainThreadId;
    const data = this.getItemById(threadId);
    if (
      data !== undefined &&
      (data.status !== "archived" || !this._isMainThread(settledThreadId))
    )
      return;
    // A removed main thread cannot render, so it moves to the draft now
    // instead of waiting on a switch that may still be loading another thread.
    const initializing =
      this._state.baseValue.newThreadId !== undefined &&
      this._state.value.newThreadId === undefined;
    if (data === undefined && !initializing) {
      let id = this._state.value.newThreadId;
      if (id === undefined) {
        const next = seedNewThread(this._state.baseValue);
        id = next.id;
        this._state.update(next.state);
      }
      this._mainThreadId = getThreadData(this._state.value, id)?.id ?? id;
      this._hookManager.stopThreadRuntime(threadId);
      void this._hookManager.startThreadRuntime(this._mainThreadId).then(
        () => this._notifySubscribers(),
        () => undefined,
      );
      this._notifySubscribers();
      this._notifyThreadIdChange();
      return;
    }
    await this._ensureThreadIsNotMain(threadId);
    if (this.getItemById(threadId) === undefined) {
      this._hookManager.stopThreadRuntime(threadId);
    }
  }

  public async archive(threadIdOrRemoteId: string) {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
    const data = this._getExposedItem(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "archiving it");
    if (data.status !== "regular")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be archived");

    do {
      await this._ensureThreadIsNotMain(data.id);
    } while (data.id === this._mainThreadId);
    this._requireAdapterGeneration(adapterGeneration);

    await this._state.optimisticUpdate({
      execute: async () => {
        const { remoteId } = await data.initializeTask;
        this._requireAdapterGeneration(adapterGeneration);
        return adapter.archive(remoteId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.id, "archived");
      },
    });
    await this._leaveRemovedMainThread(data.id);
  }

  public unarchive(threadIdOrRemoteId: string): Promise<void> {
    return this._unarchive(
      threadIdOrRemoteId,
      this._getExposedItem(threadIdOrRemoteId),
    );
  }

  // A switch unarchives the record it opens, which the list may not expose.
  private async _unarchive(
    threadIdOrRemoteId: string,
    data: RemoteThreadData | undefined,
  ): Promise<void> {
    this._requireAdapterSettled();
    const adapter = this._options.adapter;
    const adapterGeneration = this._adapterGeneration;
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
    const data = this._getExposedItem(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "deleting it");
    if (data.status !== "regular" && data.status !== "archived")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be deleted");

    do {
      await this._ensureThreadIsNotMain(data.id);
    } while (data.id === this._mainThreadId);
    this._requireAdapterGeneration(adapterGeneration);
    let remoteId: string | undefined;
    try {
      await this._state.optimisticUpdate({
        execute: async () => {
          ({ remoteId } = await data.initializeTask);
          this._requireAdapterGeneration(adapterGeneration);
          return await adapter.delete(remoteId);
        },
        optimistic: (state) =>
          deleteThreadReducer(
            state,
            data.id,
            // A replacement adapter can list its own thread under this remote id.
            this._options.adapter === adapter ? remoteId : undefined,
          ),
      });
    } catch (error) {
      const controlledThreadId = this._options.threadId;
      if (
        this._switchGeneration === this._controlledSwitchGeneration &&
        controlledThreadId !== undefined &&
        this._mainThreadId !== data.id &&
        this.getItemById(controlledThreadId)?.id === data.id
      ) {
        this._switchToThreadFromProp(controlledThreadId).catch(() => {});
      }
      throw error;
    }
    // The optimistic layer survives an adapter swap, so a resolved deletion has
    // dropped the slot from `threadData`, where `_replaceWithThreads` would
    // otherwise have found it to stop.
    this._hookManager.stopThreadRuntime(data.id);
    clearThreadTitleState(this._titleStates, data.id);
    await this._leaveRemovedMainThread(data.id);
  }

  public __internal_dispose() {
    this._disposed = true;
    this._disarmAutomaticTitles();
    this._hookManager.__internal_dispose();
  }

  public async detach(threadIdOrRemoteId: string): Promise<void> {
    const adapterGeneration = this._adapterGeneration;
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "detaching it");
    if (data.status !== "regular" && data.status !== "archived")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be detached");

    do {
      await this._ensureThreadIsNotMain(data.id);
    } while (data.id === this._mainThreadId);
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
