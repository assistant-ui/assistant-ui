import type { Unsubscribe } from "../../types";
import type { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";
import type {
  ThreadListItemCoreState,
  ThreadListRuntimeCore,
} from "../../runtime/interfaces/thread-list-runtime-core";
import type { ExternalStoreThreadListAdapter } from "./external-store-adapter";

export type ExternalStoreThreadFactory = () => ExternalStoreThreadRuntimeCore;

const EMPTY_ARRAY = Object.freeze([]);
const DEFAULT_THREAD_ID = "DEFAULT_THREAD_ID";
const DEFAULT_THREADS = Object.freeze([DEFAULT_THREAD_ID]);
const DEFAULT_THREAD = Object.freeze({
  id: DEFAULT_THREAD_ID,
  remoteId: undefined,
  externalId: undefined,
  status: "regular",
});
const RESOLVED_PROMISE = Promise.resolve();
const DEFAULT_THREAD_DATA = Object.freeze({
  [DEFAULT_THREAD_ID]: DEFAULT_THREAD,
});

export class ExternalStoreThreadListRuntimeCore
  implements ThreadListRuntimeCore
{
  private _mainThreadId: string = DEFAULT_THREAD_ID;
  private _threads: readonly string[] = DEFAULT_THREADS;
  private _archivedThreads: readonly string[] = EMPTY_ARRAY;
  private _threadData: Readonly<Record<string, ThreadListItemCoreState>> =
    DEFAULT_THREAD_DATA;

  public get isLoading() {
    return this.adapter.isLoading ?? false;
  }

  public get newThreadId() {
    return undefined;
  }

  public get threadIds() {
    return this._threads;
  }

  public get archivedThreadIds() {
    return this._archivedThreads;
  }

  public get threadItems() {
    return this._threadData;
  }

  public getLoadThreadsPromise() {
    return RESOLVED_PROMISE;
  }

  private _mainThread: ExternalStoreThreadRuntimeCore;

  public get mainThreadId() {
    return this._mainThreadId;
  }

  constructor(
    private adapter: ExternalStoreThreadListAdapter = {},
    private threadFactory: ExternalStoreThreadFactory,
  ) {
    this._mainThread = this.threadFactory();
    this.__internal_setAdapter(adapter, true);
  }

  public getMainThreadRuntimeCore() {
    return this._mainThread;
  }

  public getThreadRuntimeCore(): never {
    throw new Error("Method not implemented.");
  }

  public getItemById(threadId: string) {
    for (const thread of this.adapter.threads ?? []) {
      if (thread.id === threadId) return thread as any;
    }
    for (const thread of this.adapter.archivedThreads ?? []) {
      if (thread.id === threadId) return thread as any;
    }
    if (threadId === DEFAULT_THREAD_ID) return DEFAULT_THREAD;
    return undefined;
  }

  public __internal_setAdapter(
    adapter: ExternalStoreThreadListAdapter,
    initialLoad = false,
  ) {
    const previousAdapter = this.adapter;
    this.adapter = adapter;

    const newThreadId = adapter.threadId ?? DEFAULT_THREAD_ID;
    const newThreads = adapter.threads ?? EMPTY_ARRAY;
    const newArchivedThreads = adapter.archivedThreads ?? EMPTY_ARRAY;

    const previousThreadId = previousAdapter.threadId ?? DEFAULT_THREAD_ID;
    const previousThreads = previousAdapter.threads ?? EMPTY_ARRAY;
    const previousArchivedThreads =
      previousAdapter.archivedThreads ?? EMPTY_ARRAY;

    if (
      !initialLoad &&
      previousThreadId === newThreadId &&
      previousThreads === newThreads &&
      previousArchivedThreads === newArchivedThreads
    ) {
      return;
    }

    this._threadData = {
      ...DEFAULT_THREAD_DATA,
      ...Object.fromEntries(
        adapter.threads?.map((t) => [
          t.id,
          {
            ...t,
            remoteId: t.remoteId,
            externalId: t.externalId,
            status: "regular",
          },
        ]) ?? [],
      ),
      ...Object.fromEntries(
        adapter.archivedThreads?.map((t) => [
          t.id,
          {
            ...t,
            remoteId: t.remoteId,
            externalId: t.externalId,
            status: "archived",
          },
        ]) ?? [],
      ),
    };

    if (previousThreads !== newThreads) {
      this._threads = this.adapter.threads?.map((t) => t.id) ?? EMPTY_ARRAY;
    }

    if (previousArchivedThreads !== newArchivedThreads) {
      this._archivedThreads =
        this.adapter.archivedThreads?.map((t) => t.id) ?? EMPTY_ARRAY;
    }

    if (initialLoad || previousThreadId !== newThreadId) {
      this._mainThreadId = newThreadId;
      if (!initialLoad) {
        this._mainThread = this.threadFactory();
      }
    }

    this._notifySubscribers();
  }

  public async switchToThread(threadId: string): Promise<void> {
    if (this._mainThreadId === threadId) return;
    const onSwitchToThread = this.adapter.onSwitchToThread;
    if (!onSwitchToThread)
      throw new Error(
        "External store adapter does not support switching to thread",
      );
    await onSwitchToThread(threadId);
  }

  public async switchToNewThread(): Promise<void> {
    const onSwitchToNewThread = this.adapter.onSwitchToNewThread;
    if (!onSwitchToNewThread)
      throw new Error(
        "External store adapter does not support switching to new thread",
      );

    await onSwitchToNewThread();
  }

  public async rename(threadId: string, newTitle: string): Promise<void> {
    const onRename = this.adapter.onRename;
    if (!onRename)
      throw new Error("External store adapter does not support renaming");

    await onRename(threadId, newTitle);
  }

  public async detach(): Promise<void> {
    // no-op
  }

  public async archive(threadId: string): Promise<void> {
    const onArchive = this.adapter.onArchive;
    if (!onArchive)
      throw new Error("External store adapter does not support archiving");

    await onArchive(threadId);
  }

  public async unarchive(threadId: string): Promise<void> {
    const onUnarchive = this.adapter.onUnarchive;
    if (!onUnarchive)
      throw new Error("External store adapter does not support unarchiving");

    await onUnarchive(threadId);
  }

  public async delete(threadId: string): Promise<void> {
    const onDelete = this.adapter.onDelete;
    if (!onDelete)
      throw new Error("External store adapter does not support deleting");

    await onDelete(threadId);
  }

  public initialize(
    threadId: string,
  ): Promise<{ remoteId: string; externalId: string | undefined }> {
    return Promise.resolve({ remoteId: threadId, externalId: undefined });
  }

  public generateTitle(): never {
    throw new Error("Method not implemented.");
  }

  private _subscriptions = new Set<() => void>();

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private _notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }
}
