"use client";

import { ThreadListRuntimeCore } from "../core/ThreadListRuntimeCore";
import { generateId } from "../../internal";
import {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
} from "./types";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";
import { BaseSubscribable } from "./BaseSubscribable";
import { EMPTY_THREAD_CORE } from "./EMPTY_THREAD_CORE";
import { OptimisticState } from "./OptimisticState";
import { FC, Fragment, useEffect, useId } from "react";
import { create } from "zustand";
import { AssistantStream, AssistantMessageStream } from "assistant-stream";

type RemoteThreadData =
  | {
      readonly threadId: string;
      readonly remoteId?: undefined;
      readonly externalId?: undefined;
      readonly status: "new";
      readonly title: undefined;
    }
  | {
      readonly threadId: string;
      readonly remoteId: string;
      readonly externalId: string | undefined;
      readonly status: "regular" | "archived";
      readonly title?: string | undefined;
    };

type THREAD_MAPPING_ID = string & { __brand: "THREAD_MAPPING_ID" };
function createThreadMappingId(id: string): THREAD_MAPPING_ID {
  return id as THREAD_MAPPING_ID;
}

type RemoteThreadState = {
  readonly isLoading: boolean;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadIdMap: Readonly<Record<string, THREAD_MAPPING_ID>>;
  readonly threadData: Readonly<Record<THREAD_MAPPING_ID, RemoteThreadData>>;
};

const getThreadData = (
  state: RemoteThreadState,
  threadIdOrRemoteId: string,
) => {
  const idx = state.threadIdMap[threadIdOrRemoteId];
  if (idx === undefined) return undefined;
  return state.threadData[idx];
};

const updateStatusReducer = (
  state: RemoteThreadState,
  threadIdOrRemoteId: string,
  newStatus: "regular" | "archived" | "deleted",
) => {
  const data = getThreadData(state, threadIdOrRemoteId);
  if (!data) return state;

  const { threadId, remoteId, status: lastStatus } = data;
  if (lastStatus === newStatus) return state;

  const newState = { ...state };

  // lastStatus
  switch (lastStatus) {
    case "new":
      newState.newThreadId = undefined;
      break;
    case "regular":
      newState.threadIds = newState.threadIds.filter((t) => t !== threadId);
      break;
    case "archived":
      newState.archivedThreadIds = newState.archivedThreadIds.filter(
        (t) => t !== threadId,
      );
      break;

    default: {
      const _exhaustiveCheck: never = lastStatus;
      throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
    }
  }

  // newStatus
  switch (newStatus) {
    case "regular":
      newState.threadIds = [threadId, ...newState.threadIds];
      break;

    case "archived":
      newState.archivedThreadIds = [threadId, ...newState.archivedThreadIds];
      break;

    case "deleted":
      newState.threadData = Object.fromEntries(
        Object.entries(newState.threadData).filter(([key]) => key !== threadId),
      );
      newState.threadIdMap = Object.fromEntries(
        Object.entries(newState.threadIdMap).filter(
          ([key]) => key !== threadId && key !== remoteId,
        ),
      );
      break;

    default: {
      const _exhaustiveCheck: never = newStatus;
      throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
    }
  }

  if (newStatus !== "deleted") {
    newState.threadData = {
      ...newState.threadData,
      [threadId]: {
        ...data,
        status: newStatus,
      },
    };
  }

  return newState;
};

export class RemoteThreadListThreadListRuntimeCore
  extends BaseSubscribable
  implements ThreadListRuntimeCore
{
  private _adapter!: RemoteThreadListAdapter;
  private readonly _hookManager: RemoteThreadListHookInstanceManager;

  private _loadThreadsPromise: Promise<void> | undefined;

  private _mainThreadId!: string;
  private readonly _state = new OptimisticState<RemoteThreadState>({
    isLoading: false,
    newThreadId: undefined,
    threadIds: [],
    archivedThreadIds: [],
    threadIdMap: {},
    threadData: {},
  });

  public getLoadThreadsPromise() {
    // TODO this needs to be cached in case this promise is loaded during suspense
    if (!this._loadThreadsPromise) {
      this._loadThreadsPromise = this._state
        .optimisticUpdate({
          execute: () => this._adapter.list(),
          loading: (state) => {
            return {
              ...state,
              isLoading: true,
            };
          },
          then: (state, l) => {
            const newThreadIds = [];
            const newArchivedThreadIds = [];
            const newThreadIdMap = {} as Record<string, THREAD_MAPPING_ID>;
            const newThreadData = {} as Record<
              THREAD_MAPPING_ID,
              RemoteThreadData
            >;

            for (const thread of l.threads) {
              switch (thread.status) {
                case "regular":
                  newThreadIds.push(thread.remoteId);
                  break;
                case "archived":
                  newArchivedThreadIds.push(thread.remoteId);
                  break;
                default: {
                  const _exhaustiveCheck: never = thread.status;
                  throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
                }
              }

              const mappingId = createThreadMappingId(thread.remoteId);
              newThreadIdMap[thread.remoteId] = mappingId;
              newThreadData[mappingId] = {
                threadId: thread.remoteId,
                remoteId: thread.remoteId,
                externalId: thread.externalId,
                status: thread.status,
                title: thread.title,
              };
            }

            return {
              ...state,
              threadIds: newThreadIds,
              archivedThreadIds: newArchivedThreadIds,
              threadIdMap: {
                ...state.threadIdMap,
                ...newThreadIdMap,
              },
              threadData: {
                ...state.threadData,
                ...newThreadData,
              },
            };
          },
        })
        .then(() => {});
    }

    return this._loadThreadsPromise;
  }

  constructor(adapter: RemoteThreadListAdapter) {
    super();

    this._state.subscribe(() => this._notifySubscribers());
    this._hookManager = new RemoteThreadListHookInstanceManager(
      adapter.runtimeHook,
    );
    this.useProvider = create(() => ({
      Provider: adapter.unstable_Provider ?? Fragment,
    }));
    this.__internal_setAdapter(adapter);

    this.switchToNewThread();
  }

  private useProvider;

  public __internal_setAdapter(adapter: RemoteThreadListAdapter) {
    if (this._adapter === adapter) return;

    this._adapter = adapter;

    const Provider = adapter.unstable_Provider ?? Fragment;
    if (Provider !== this.useProvider.getState().Provider) {
      this.useProvider.setState({ Provider }, true);
    }

    this._hookManager.setRuntimeHook(adapter.runtimeHook);
  }

  public __internal_bindAdapter() {
    this.getLoadThreadsPromise(); // begin loading on initial bind
    return this._adapter.subscribe({
      onInitialize: this._onInitialize,
      onGenerateTitle: this._onGenerateTitle,
    });
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

  public getMainThreadRuntimeCore() {
    const result = this._hookManager.getThreadRuntimeCore(this._mainThreadId);
    if (!result) return EMPTY_THREAD_CORE;
    return result;
  }

  public getThreadRuntimeCore(threadIdOrRemoteId: string) {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");

    const result = this._hookManager.getThreadRuntimeCore(data.threadId);
    if (!result) throw new Error("Thread not found");
    return result;
  }

  public getItemById(threadIdOrRemoteId: string) {
    return getThreadData(this._state.value, threadIdOrRemoteId);
  }

  public async switchToThread(threadIdOrRemoteId: string): Promise<void> {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");

    if (this._mainThreadId === data.threadId) return;

    const task = this._hookManager.startThreadRuntime(data.threadId);
    if (this.mainThreadId !== undefined) {
      await task;
    } else {
      task.then(() => this._notifySubscribers());
    }

    if (data.status === "archived") await this.unarchive(data.threadId);
    this._mainThreadId = data.threadId;

    this._notifySubscribers();
  }

  public async switchToNewThread(): Promise<void> {
    // an initialization transaction is in progress, wait for it to settle
    while (
      this._state.baseValue.newThreadId !== undefined &&
      this._state.value.newThreadId === undefined
    ) {
      await this._state.waitForUpdate();
    }

    const state = this._state.value;
    let threadId: string | undefined = this._state.value.newThreadId;
    if (threadId === undefined) {
      do {
        threadId = `__LOCALID_${generateId()}`;
      } while (state.threadIdMap[threadId]);

      const mappingId = createThreadMappingId(threadId);
      this._state.update({
        ...state,
        newThreadId: threadId,
        threadIdMap: {
          ...state.threadIdMap,
          [threadId]: mappingId,
        },
        threadData: {
          ...state.threadData,
          [threadId]: {
            status: "new",
            threadId,
          },
        },
      });
    }

    return this.switchToThread(threadId);
  }

  private _onInitialize = async (
    threadId: string,
    begin: () => Promise<RemoteThreadInitializeResponse>,
  ) => {
    if (this._state.value.newThreadId !== threadId)
      throw new Error("The provided thread is already initialized");

    await this._state.optimisticUpdate({
      execute: () => {
        return begin();
      },
      optimistic: (state) => {
        return updateStatusReducer(state, threadId, "regular");
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
            [threadId]: {
              ...data,
              remoteId,
              externalId,
            },
          },
        };
      },
    });
  };

  private _onGenerateTitle = async (
    remoteId: string,
    begin: () => Promise<AssistantStream>,
  ) => {
    const data = this.getItemById(remoteId);
    if (!data) throw new Error("Thread not found");
    if (data.status === "new") throw new Error("Thread is not yet initialized");

    const stream = await begin();
    const messageStream = AssistantMessageStream.fromAssistantStream(stream);
    for await (const result of messageStream) {
      const newTitle =
        result.content.filter((c) => c.type === "text")[0]?.text ??
        "New Thread";
      const state = this._state.baseValue;
      this._state.update({
        ...state,
        threadData: {
          ...state.threadData,
          [data.threadId]: {
            ...data,
            title: newTitle,
          },
        },
      });
    }
  };

  public rename(threadIdOrRemoteId: string, newTitle: string): Promise<void> {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");
    if (data.status === "new") throw new Error("Thread is not yet initialized");

    return this._state.optimisticUpdate({
      execute: () => {
        return this._adapter.rename(data.remoteId, newTitle);
      },
      optimistic: (state) => {
        const data = getThreadData(state, threadIdOrRemoteId);
        if (!data) return state;

        return {
          ...state,
          threadData: {
            ...state.threadData,
            [data.threadId]: {
              ...data,
              title: newTitle,
            },
          },
        };
      },
    });
  }

  private async _ensureThreadIsNotMain(threadId: string) {
    // if thread is main thread, switch to another thread
    if (threadId === this._mainThreadId) {
      const lastThreadId = this._state.value.threadIds[0];
      if (lastThreadId) {
        await this.switchToThread(lastThreadId);
      } else {
        await this.switchToNewThread();
      }
    }
  }

  public async archive(threadIdOrRemoteId: string) {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "regular")
      throw new Error("Thread is not yet initialized or already archived");

    return this._state.optimisticUpdate({
      execute: async () => {
        await this._ensureThreadIsNotMain(data.threadId);
        return this._adapter.archive(data.remoteId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.threadId, "archived");
      },
    });
  }

  public unarchive(threadIdOrRemoteId: string): Promise<void> {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "archived") throw new Error("Thread is not archived");

    return this._state.optimisticUpdate({
      execute: async () => {
        try {
          return await this._adapter.unarchive(data.remoteId);
        } catch (error) {
          await this._ensureThreadIsNotMain(data.threadId);
          throw error;
        }
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.threadId, "regular");
      },
    });
  }

  public async delete(threadIdOrRemoteId: string) {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "regular" && data.status !== "archived")
      throw new Error("Thread is not yet initialized");

    return this._state.optimisticUpdate({
      execute: async () => {
        await this._ensureThreadIsNotMain(data.threadId);
        return await this._adapter.delete(data.remoteId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.threadId, "deleted");
      },
    });
  }

  private useBoundIds = create<string[]>(() => []);

  public __internal_RenderComponent: FC = () => {
    const id = useId();
    useEffect(() => {
      this.useBoundIds.setState((s) => [...s, id], true);
      return () => {
        this.useBoundIds.setState((s) => s.filter((i) => i !== id), true);
      };
    }, []);

    const boundIds = this.useBoundIds();
    const { Provider } = this.useProvider();

    return (
      (boundIds.length === 0 || boundIds[0] === id) && (
        // only render if the component is the first one mounted
        <this._hookManager.__internal_RenderThreadRuntimes
          provider={Provider}
        />
      )
    );
  };
}
