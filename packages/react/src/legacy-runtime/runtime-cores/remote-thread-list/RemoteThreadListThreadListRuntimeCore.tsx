"use client";

import type { ThreadListRuntimeCore } from "@assistant-ui/core";
import {
  generateId,
  BaseSubscribable,
  OptimisticState,
  EMPTY_THREAD_CORE,
  type RemoteThreadData,
  type THREAD_MAPPING_ID,
  type RemoteThreadState,
  createThreadMappingId,
  getThreadData,
  updateStatusReducer,
  type RemoteThreadListOptions,
} from "@assistant-ui/core/internal";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";
import {
  ComponentType,
  FC,
  Fragment,
  PropsWithChildren,
  useEffect,
  useId,
} from "react";
import { create } from "zustand";
import { AssistantMessageStream } from "assistant-stream";
import { ModelContextProvider } from "../../../model-context";
import { RuntimeAdapterProvider } from "../adapters/RuntimeAdapterProvider";

export class RemoteThreadListThreadListRuntimeCore
  extends BaseSubscribable
  implements ThreadListRuntimeCore
{
  private _options!: RemoteThreadListOptions;
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

  public get threadItems() {
    return this._state.value.threadData;
  }

  public getLoadThreadsPromise() {
    // TODO this needs to be cached in case this promise is loaded during suspense
    if (!this._loadThreadsPromise) {
      this._loadThreadsPromise = this._state
        .optimisticUpdate({
          execute: () => this._options.adapter.list(),
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
                id: thread.remoteId,
                remoteId: thread.remoteId,
                externalId: thread.externalId,
                status: thread.status,
                title: thread.title,
                initializeTask: Promise.resolve({
                  remoteId: thread.remoteId,
                  externalId: thread.externalId,
                }),
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

  constructor(
    options: RemoteThreadListOptions,
    private readonly contextProvider: ModelContextProvider,
  ) {
    super();

    this._state.subscribe(() => this._notifySubscribers());
    this._hookManager = new RemoteThreadListHookInstanceManager(
      options.runtimeHook,
      this,
    );
    this.useProvider = create(() => ({
      Provider: (options.adapter.unstable_Provider ??
        Fragment) as ComponentType<PropsWithChildren>,
    }));
    this.__internal_setOptions(options);
    this.switchToNewThread();
  }

  private useProvider;

  public __internal_setOptions(options: RemoteThreadListOptions) {
    if (this._options === options) return;

    this._options = options;

    const Provider = (options.adapter.unstable_Provider ??
      Fragment) as ComponentType<PropsWithChildren>;
    if (Provider !== this.useProvider.getState().Provider) {
      this.useProvider.setState({ Provider }, true);
    }

    this._hookManager.setRuntimeHook(options.runtimeHook);
  }

  public __internal_load() {
    this.getLoadThreadsPromise(); // begin loading on initial bind
  }

  public get isLoading() {
    return this._state.value.isLoading;
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

    const result = this._hookManager.getThreadRuntimeCore(data.id);
    if (!result) throw new Error("Thread not found");
    return result;
  }

  public getItemById(threadIdOrRemoteId: string) {
    return getThreadData(this._state.value, threadIdOrRemoteId);
  }

  public async switchToThread(threadIdOrRemoteId: string): Promise<void> {
    let data = this.getItemById(threadIdOrRemoteId);

    if (!data) {
      const remoteMetadata =
        await this._options.adapter.fetch(threadIdOrRemoteId);
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
        } as RemoteThreadData,
      };

      const newThreadIdMap = {
        ...state.threadIdMap,
        [remoteMetadata.remoteId]: mappingId,
      };

      const newThreadIds =
        remoteMetadata.status === "regular"
          ? [...state.threadIds, remoteMetadata.remoteId]
          : state.threadIds;

      const newArchivedThreadIds =
        remoteMetadata.status === "archived"
          ? [...state.archivedThreadIds, remoteMetadata.remoteId]
          : state.archivedThreadIds;

      this._state.update({
        ...state,
        threadIds: newThreadIds,
        archivedThreadIds: newArchivedThreadIds,
        threadIdMap: newThreadIdMap,
        threadData: newThreadData,
      });

      data = this.getItemById(threadIdOrRemoteId);
    }

    if (!data) throw new Error("Thread not found");
    if (this._mainThreadId === data.id) return;

    const task = this._hookManager.startThreadRuntime(data.id);
    if (this.mainThreadId !== undefined) {
      await task;
    } else {
      task.then(() => this._notifySubscribers());
    }

    if (data.status === "archived") await this.unarchive(data.id);
    this._mainThreadId = data.id;

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
    let id: string | undefined = this._state.value.newThreadId;
    if (id === undefined) {
      do {
        id = `__LOCALID_${generateId()}`;
      } while (state.threadIdMap[id]);

      const mappingId = createThreadMappingId(id);
      this._state.update({
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
          } satisfies RemoteThreadData,
        },
      });
    }

    return this.switchToThread(id);
  }

  public initialize = async (threadId: string) => {
    if (this._state.value.newThreadId !== threadId) {
      const data = this.getItemById(threadId);
      if (!data) throw new Error("Thread not found");
      if (data.status === "new") throw new Error("Unexpected new state");
      return data.initializeTask;
    }

    return this._state.optimisticUpdate({
      execute: () => {
        return this._options.adapter.initialize(threadId);
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
  };

  public generateTitle = async (threadId: string) => {
    const data = this.getItemById(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.status === "new") throw new Error("Thread is not yet initialized");

    const { remoteId } = await data.initializeTask;

    const runtimeCore = this._hookManager.getThreadRuntimeCore(data.id);
    if (!runtimeCore) return; // thread is no longer running

    const messages = runtimeCore.messages;
    const stream = await this._options.adapter.generateTitle(
      remoteId,
      messages,
    );
    const messageStream = AssistantMessageStream.fromAssistantStream(stream);
    for await (const result of messageStream) {
      const newTitle = result.parts.filter((c) => c.type === "text")[0]?.text;
      const state = this._state.baseValue;
      this._state.update({
        ...state,
        threadData: {
          ...state.threadData,
          [data.id]: {
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
      execute: async () => {
        const { remoteId } = await data.initializeTask;
        return this._options.adapter.rename(remoteId, newTitle);
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
              title: newTitle,
            },
          },
        };
      },
    });
  }

  private async _ensureThreadIsNotMain(threadId: string) {
    if (threadId === this.newThreadId)
      throw new Error("Cannot ensure new thread is not main");

    if (threadId === this._mainThreadId) {
      await this.switchToNewThread();
    }
  }

  public async archive(threadIdOrRemoteId: string) {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "regular")
      throw new Error("Thread is not yet initialized or already archived");

    return this._state.optimisticUpdate({
      execute: async () => {
        await this._ensureThreadIsNotMain(data.id);
        const { remoteId } = await data.initializeTask;
        return this._options.adapter.archive(remoteId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.id, "archived");
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
          const { remoteId } = await data.initializeTask;
          return await this._options.adapter.unarchive(remoteId);
        } catch (error) {
          await this._ensureThreadIsNotMain(data.id);
          throw error;
        }
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.id, "regular");
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
        await this._ensureThreadIsNotMain(data.id);
        const { remoteId } = await data.initializeTask;
        return await this._options.adapter.delete(remoteId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.id, "deleted");
      },
    });
  }

  public async detach(threadIdOrRemoteId: string): Promise<void> {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "regular" && data.status !== "archived")
      throw new Error("Thread is not yet initialized");

    await this._ensureThreadIsNotMain(data.id);
    this._hookManager.stopThreadRuntime(data.id);
  }

  private useBoundIds = create<string[]>(() => []);

  public __internal_RenderComponent: FC = () => {
    const id = useId();
    useEffect(() => {
      this.useBoundIds.setState((s) => [...s, id], true);
      return () => {
        this.useBoundIds.setState((s) => s.filter((i) => i !== id), true);
      };
    }, [id]);

    const boundIds = this.useBoundIds();
    const { Provider } = this.useProvider();

    const adapters = {
      modelContext: this.contextProvider,
    };

    return (
      (boundIds.length === 0 || boundIds[0] === id) && (
        // only render if the component is the first one mounted
        <RuntimeAdapterProvider adapters={adapters}>
          <this._hookManager.__internal_RenderThreadRuntimes
            provider={Provider}
          />
        </RuntimeAdapterProvider>
      )
    );
  };
}
