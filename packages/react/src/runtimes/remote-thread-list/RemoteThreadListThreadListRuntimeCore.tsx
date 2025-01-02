import { ThreadListRuntimeCore } from "../core/ThreadListRuntimeCore";
import { generateId } from "../../internal";
import { RemoteThreadListAdapter } from "./types";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";
import { BaseSubscribable } from "./BaseSubscribable";
import { EMPTY_THREAD_CORE } from "./EMPTY_THREAD_CORE";
import { OptimisticState } from "./OptimisticState";
import { FC, PropsWithChildren, useEffect, useId } from "react";
import { create } from "zustand";

type RemoteThreadData = {
  readonly threadId: string;
  readonly remoteId?: string;
  readonly status: "new" | "regular" | "archived";
  readonly title?: string | undefined;
};

type RemoteThreadState = {
  readonly isLoading: boolean;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadData: Readonly<Record<string, RemoteThreadData>>;
};

const updateStatusReducer = (
  state: RemoteThreadState,
  threadId: string,
  newStatus: "regular" | "archived" | "deleted",
) => {
  const data = state.threadData[threadId];
  if (!data) return state;

  const { status: lastStatus } = data;
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
      newState.threadIds = [...newState.threadIds, threadId];
      break;

    case "archived":
      newState.archivedThreadIds = [...newState.archivedThreadIds, threadId];
      break;

    case "deleted":
      newState.threadData = Object.fromEntries(
        Object.entries(newState.threadData).filter(([key]) => key !== threadId),
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
  private _disposeOldAdapter?: () => void;
  private readonly _hookManager: RemoteThreadListHookInstanceManager;

  private readonly _loadThreadsPromise: Promise<void>;

  private _mainThreadId!: string;
  private readonly _state = new OptimisticState<RemoteThreadState>({
    isLoading: false,
    newThreadId: undefined,
    threadIds: [],
    archivedThreadIds: [],
    threadData: {},
  });

  public getLoadThreadsPromise() {
    return this._loadThreadsPromise;
  }

  constructor(adapter: RemoteThreadListAdapter) {
    super();

    this._state.subscribe(() => this._notifySubscribers());
    this._hookManager = new RemoteThreadListHookInstanceManager(
      adapter.runtimeHook,
    );
    this.__internal_setAdapter(adapter);

    this._loadThreadsPromise = this._state
      .optimisticUpdate({
        execute: () => adapter.list(),
        loading: (state) => {
          return {
            ...state,
            isLoading: true,
          };
        },
        then: (state, l) => {
          const newThreadIds = [];
          const newArchivedThreadIds = [];
          const newThreadData = {} as Record<string, RemoteThreadData>;

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

            newThreadData[thread.remoteId] = {
              threadId: thread.remoteId,
              remoteId: thread.remoteId,
              status: thread.status,
              title: thread.title,
            };
          }

          return {
            ...state,
            threadIds: newThreadIds,
            archivedThreadIds: newArchivedThreadIds,
            threadData: {
              ...state.threadData,
              ...newThreadData,
            },
          };
        },
      })
      .then(() => {});

    this.switchToNewThread();
  }

  public __internal_setAdapter(adapter: RemoteThreadListAdapter) {
    this._adapter = adapter;
    this._disposeOldAdapter?.();
    this._disposeOldAdapter = this._adapter.onInitialize(this._onInitialize);

    this._hookManager.setRuntimeHook(adapter.runtimeHook);
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

  public getItemById(threadId: string) {
    return this._state.value.threadData[threadId];
  }

  public async switchToThread(threadId: string): Promise<void> {
    if (this._mainThreadId === threadId) return;

    const data = this.getItemById(threadId);
    if (!data) throw new Error("Thread not found");

    const task = this._hookManager.startThreadRuntime(threadId);
    if (this.mainThreadId !== undefined) {
      await task;
    } else {
      task.then(() => this._notifySubscribers());
    }

    if (data.status === "archived") void this.unarchive(threadId);
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
      } while (state.threadData[threadId]);

      this._state.update({
        ...state,
        newThreadId: threadId,
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

  private _onInitialize = async (task: Promise<{ remoteId: string }>) => {
    const threadId = this._state.value.newThreadId;
    if (!threadId)
      throw new Error(
        "ThreadListAdapter called onInitialize before switching to new thread",
      );

    await this._state.optimisticUpdate({
      execute: () => {
        return task;
      },
      optimistic: (state) => {
        return updateStatusReducer(state, threadId, "regular");
      },
      then: (state, { remoteId }) => {
        const data = state.threadData[threadId];
        if (!data) return state;

        return {
          ...state,
          threadData: {
            ...state.threadData,
            [threadId]: {
              ...data,
              remoteId,
            },
          },
        };
      },
    });
  };

  public rename(threadId: string, newTitle: string): Promise<void> {
    return this._state.optimisticUpdate({
      execute: () => {
        return this._adapter.rename(threadId, newTitle);
      },
      optimistic: (state) => {
        const data = state.threadData[threadId];
        if (!data) return state;

        return {
          ...state,
          threadData: {
            ...state.threadData,
            [threadId]: {
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

  public async archive(threadId: string) {
    const data = this.getItemById(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "regular")
      throw new Error("Thread is not yet initialized or already archived");

    return this._state.optimisticUpdate({
      execute: async () => {
        await this._ensureThreadIsNotMain(threadId);
        return this._adapter.archive(threadId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, threadId, "archived");
      },
    });
  }

  public unarchive(threadId: string): Promise<void> {
    const data = this.getItemById(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "archived") throw new Error("Thread is not archived");

    return this._state.optimisticUpdate({
      execute: async () => {
        try {
          return await this._adapter.unarchive(threadId);
        } catch (error) {
          await this._ensureThreadIsNotMain(threadId);
          throw error;
        }
      },
      optimistic: (state) => {
        return updateStatusReducer(state, threadId, "regular");
      },
    });
  }

  public async delete(threadId: string) {
    const data = this.getItemById(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "regular" && data.status !== "archived")
      throw new Error("Thread is not yet initialized");

    return this._state.optimisticUpdate({
      execute: async () => {
        await this._ensureThreadIsNotMain(threadId);
        return await this._adapter.delete(threadId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, threadId, "deleted");
      },
    });
  }

  private useBoundIds = create<string[]>(() => []);

  public __internal_RenderThreadRuntimes: FC<PropsWithChildren> = () => {
    const id = useId();
    useEffect(() => {
      this.useBoundIds.setState((s) => [...s, id], true);
      return () => {
        this.useBoundIds.setState((s) => s.filter((i) => i !== id), true);
      };
    }, []);

    const boundIds = this.useBoundIds();

    // only render if the component is the first one mounted
    if (boundIds.length > 0 && boundIds[0] !== id) return;

    return <this._hookManager.__internal_RenderThreadRuntimes />;
  };
}
