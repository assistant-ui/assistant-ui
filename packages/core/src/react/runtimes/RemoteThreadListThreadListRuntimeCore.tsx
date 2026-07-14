import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import { generateId } from "../../utils/id";
import { BaseSubscribable } from "../../subscribable/subscribable";
import { OptimisticState } from "../../runtimes/remote-thread-list/optimistic-state";
import { EMPTY_THREAD_CORE } from "../../runtimes/remote-thread-list/empty-thread-core";
import type {
  RemoteThreadData,
  RemoteThreadState,
} from "../../runtimes/remote-thread-list/remote-thread-state";
import {
  classifyThreads,
  createThreadMappingId,
  getThreadData,
  normalizeCursor,
  updateStatusReducer,
} from "../../runtimes/remote-thread-list/remote-thread-state";
import type { RemoteThreadListOptions } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";
import { type FC, Fragment, useEffect, useId } from "react";
import { create } from "zustand";
import { AssistantMessageStream } from "assistant-stream";
import type { ModelContextProvider } from "../../model-context/types";
import { RuntimeAdapterProvider } from "./RuntimeAdapterProvider";
import type { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ThreadForkOptions } from "../../types/thread-fork";

const forkRepositoryAtMessage = (
  repository: ExportedMessageRepository,
  messageId: string | undefined,
): ExportedMessageRepository => {
  if (!messageId) return repository;

  const itemsById = new Map(
    repository.messages.map((item) => [item.message.id, item]),
  );
  const firstItem = itemsById.get(messageId);
  if (!firstItem) throw new Error("Message not found in thread");

  const branchIds = new Set<string>();
  for (
    let item: (typeof repository.messages)[number] | undefined = firstItem;
    item;
    item = item.parentId ? itemsById.get(item.parentId) : undefined
  ) {
    branchIds.add(item.message.id);
  }

  return {
    headId: messageId,
    messages: repository.messages.filter((item) =>
      branchIds.has(item.message.id),
    ),
  };
};

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

export class RemoteThreadListThreadListRuntimeCore
  extends BaseSubscribable
  implements ThreadListRuntimeCore
{
  private _options!: RemoteThreadListOptions;
  private readonly _hookManager: RemoteThreadListHookInstanceManager;

  private _loadThreadsPromise: Promise<void> | undefined;
  private _loadMorePromise: Promise<void> | undefined;
  private _loadGeneration = 0;

  private _mainThreadId!: string;
  private readonly _state = new OptimisticState<RemoteThreadState>({
    isLoading: true,
    isLoadingMore: false,
    cursor: undefined,
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
      const generation = this._loadGeneration;
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
            if (generation !== this._loadGeneration) return state;
            const fresh = classifyThreads(l.threads, {
              threadIds: [],
              archivedThreadIds: [],
              threadIdMap: {},
              threadData: {},
            });

            return {
              ...state,
              isLoading: false,
              cursor: normalizeCursor(l.nextCursor),
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
          if (generation !== this._loadGeneration) return;
          console.error("[assistant-ui] thread list load failed:", error);
          this._loadThreadsPromise = undefined;
          this._state.update({
            ...this._state.baseValue,
            isLoading: false,
          });
        })
        .then(() => {});
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
        loading: (state) => ({ ...state, isLoadingMore: true }),
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

  private readonly contextProvider: ModelContextProvider;

  constructor(
    options: RemoteThreadListOptions,
    contextProvider: ModelContextProvider,
  ) {
    super();
    this.contextProvider = contextProvider;

    this._state.subscribe(() => {
      this._notifySubscribers();
      this._notifyThreadIdChange();
    });
    this._hookManager = new RemoteThreadListHookInstanceManager(
      options.runtimeHook,
      this,
    );
    this.useProvider = create(() => ({
      Provider: options.adapter.unstable_Provider ?? Fragment,
    }));
    this.__internal_setOptions(options);
    this.switchToNewThread();
  }

  private _initialThreadLoaded = false;
  private useProvider;

  public __internal_setOptions(options: RemoteThreadListOptions) {
    if (this._options === options) return;

    const adapterChanged =
      this._options !== undefined && this._options.adapter !== options.adapter;

    this._options = options;

    const Provider = options.adapter.unstable_Provider ?? Fragment;
    if (Provider !== this.useProvider.getState().Provider) {
      this.useProvider.setState({ Provider }, true);
    }

    this._hookManager.setRuntimeHook(options.runtimeHook);

    if (adapterChanged) {
      this._loadGeneration++;
      this._loadThreadsPromise = undefined;
      this._loadMorePromise = undefined;
      this._state.update({
        ...this._state.baseValue,
        cursor: undefined,
      });
    }
  }

  public __internal_load() {
    this.getLoadThreadsPromise(); // begin loading on initial bind
    const startThreadId =
      this._options.threadId ?? this._options.initialThreadId;
    if (!this._initialThreadLoaded && startThreadId) {
      this._initialThreadLoaded = true;
      this.switchToThread(startThreadId).catch(() => {});
    }
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

  private _notifyThreadIdChange() {
    const threadId = this._mainThreadRemoteId;
    if (this._lastNotifiedThreadId === threadId) return;
    this._lastNotifiedThreadId = threadId;
    this._options.onThreadIdChange?.(threadId);
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

  public getItemById(threadIdOrRemoteId: string) {
    return getThreadData(this._state.value, threadIdOrRemoteId);
  }

  public async switchToThread(
    threadIdOrRemoteId: string,
    options?: { unarchive?: boolean },
  ): Promise<void> {
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
          forkedFrom: remoteMetadata.forkedFrom,
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

      // Filter both arrays first so a concurrent `list()` can't leave the id
      // duplicated or under the wrong status.
      const threadIdsWithoutRemote = state.threadIds.filter(
        (id) => id !== remoteMetadata.remoteId,
      );
      const archivedThreadIdsWithoutRemote = state.archivedThreadIds.filter(
        (id) => id !== remoteMetadata.remoteId,
      );

      const newThreadIds =
        remoteMetadata.status === "regular"
          ? [...threadIdsWithoutRemote, remoteMetadata.remoteId]
          : threadIdsWithoutRemote;
      const newArchivedThreadIds =
        remoteMetadata.status === "archived"
          ? [...archivedThreadIdsWithoutRemote, remoteMetadata.remoteId]
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
      task.then(() => this._notifySubscribers());
    }

    if (data.status === "archived" && options?.unarchive !== false) {
      await this.unarchive(data.id);
    }
    this._mainThreadId = data.id;

    this._notifySubscribers();
    this._notifyThreadIdChange();
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
            forkedFrom: undefined,
            title: undefined,
            custom: undefined,
          } satisfies RemoteThreadData,
        },
      });
    }

    return this.switchToThread(id);
  }

  public initialize = async (threadId: string) => {
    if (this._state.value.newThreadId !== threadId) {
      const data = this.getItemById(threadId);
      if (!data) throw threadNotFoundError(threadId, "initializing it");
      if (data.status === "new")
        throw threadStatusError(threadId, data.status, "be initialized here");
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
    if (!data) throw threadNotFoundError(threadId, "generating its title");
    if (data.status === "new")
      throw threadStatusError(threadId, data.status, "generate a title");

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
      const currentData = getThreadData(state, data.id);
      if (!currentData) continue;
      this._state.update({
        ...state,
        threadData: {
          ...state.threadData,
          [currentData.id]: {
            ...currentData,
            title: newTitle,
          },
        },
      });
    }
  };

  public rename(threadIdOrRemoteId: string, newTitle: string): Promise<void> {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "renaming it");
    if (data.status === "new")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be renamed");

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

  public updateCustom(
    threadIdOrRemoteId: string,
    custom: Record<string, unknown> | undefined,
  ): Promise<void> {
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

    if (!this._options.adapter.updateCustom) {
      throw new Error(
        "Remote thread list adapter does not support updating custom metadata",
      );
    }

    return this._state.optimisticUpdate({
      execute: async () => {
        const { remoteId } = await data.initializeTask;
        const adapter = this._options.adapter;
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

    if (threadId === this._mainThreadId) {
      await this.switchToNewThread();
    }
  }

  public async archive(threadIdOrRemoteId: string) {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "archiving it");
    if (data.status !== "regular")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be archived");

    await this._ensureThreadIsNotMain(data.id);

    return this._state.optimisticUpdate({
      execute: async () => {
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
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "unarchiving it");
    if (data.status !== "archived")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be unarchived");

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
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "deleting it");
    if (data.status !== "regular" && data.status !== "archived")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be deleted");

    await this._ensureThreadIsNotMain(data.id);
    this._hookManager.stopThreadRuntime(data.id);

    return this._state.optimisticUpdate({
      execute: async () => {
        const { remoteId } = await data.initializeTask;
        return await this._options.adapter.delete(remoteId);
      },
      optimistic: (state) => {
        return updateStatusReducer(state, data.id, "deleted");
      },
    });
  }

  public async fork(
    threadIdOrRemoteId: string,
    options?: ThreadForkOptions,
  ): Promise<{ threadId: string }> {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw new Error("Thread not found");

    const adapter = this._options.adapter;
    const forkAdapter = adapter.fork?.bind(adapter);
    if (!forkAdapter) {
      throw new Error("Remote thread list adapter does not support forking");
    }

    const sourceInitializeTask =
      data.status === "new" ? this.initialize(data.id) : data.initializeTask;
    const sourceRuntime = this._hookManager.getThreadRuntimeCore(data.id);
    const forkRepository = sourceRuntime
      ? forkRepositoryAtMessage(sourceRuntime.export(), options?.fromMessageId)
      : undefined;
    let forkExternalState: unknown;
    let hasForkExternalState = false;
    if (sourceRuntime && forkRepository) {
      try {
        forkExternalState = sourceRuntime.exportExternalState(forkRepository);
        hasForkExternalState = true;
      } catch (error) {
        // Runtimes without an external state format use the assistant-ui
        // repository import path below; anything else is a real export bug.
        if (
          !(error instanceof Error) ||
          !error.message.includes("does not support")
        ) {
          console.warn(
            "[assistant-ui] exportExternalState failed during fork; falling back to repository import:",
            error,
          );
        }
      }
    }
    return this._state
      .optimisticUpdate({
        execute: async () => {
          const source = await sourceInitializeTask;
          const forked = await forkAdapter(source.remoteId, options);
          return { forked, source };
        },
        then: (state, { forked, source }) => {
          const stateSource = getThreadData(state, threadIdOrRemoteId);
          const forkedRemoteId = forked.remoteId;
          const mappingId = createThreadMappingId(forkedRemoteId);

          return {
            ...state,
            threadIds: [
              forkedRemoteId,
              ...state.threadIds.filter((id) => id !== forkedRemoteId),
            ],
            archivedThreadIds: state.archivedThreadIds.filter(
              (id) => id !== forkedRemoteId,
            ),
            threadIdMap: {
              ...state.threadIdMap,
              [forkedRemoteId]: mappingId,
            },
            threadData: {
              ...state.threadData,
              [mappingId]: {
                id: forkedRemoteId,
                initializeTask: Promise.resolve(forked),
                remoteId: forkedRemoteId,
                externalId: forked.externalId,
                forkedFrom: {
                  threadId:
                    stateSource?.remoteId ?? source.remoteId ?? data.remoteId,
                  ...(options?.fromMessageId
                    ? { messageId: options.fromMessageId }
                    : {}),
                },
                status: "regular",
                title: undefined,
                lastMessageAt: undefined,
                custom: undefined,
              },
            },
          };
        },
      })
      .then(async ({ forked }) => {
        if (forkRepository) {
          const forkRuntime = await this._hookManager.startThreadRuntime(
            forked.remoteId,
          );
          if (hasForkExternalState) {
            forkRuntime.importExternalState(forkExternalState);
          } else {
            forkRuntime.import(forkRepository);
          }
        }
        return { threadId: forked.remoteId };
      });
  }

  public async detach(threadIdOrRemoteId: string): Promise<void> {
    const data = this.getItemById(threadIdOrRemoteId);
    if (!data) throw threadNotFoundError(threadIdOrRemoteId, "detaching it");
    if (data.status !== "regular" && data.status !== "archived")
      throw threadStatusError(threadIdOrRemoteId, data.status, "be detached");

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
