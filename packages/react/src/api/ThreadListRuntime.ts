import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";
import {
  ThreadListMetadata,
  ThreadListRuntimeCore,
} from "../runtimes/core/ThreadListRuntimeCore";
import { Unsubscribe } from "../types";
import { ThreadListRuntimePath } from "./RuntimePathTypes";
import {
  ThreadListItemRuntime,
  ThreadListItemRuntimeImpl,
} from "./ThreadListItemRuntime";
import { SKIP_UPDATE } from "./subscribable/SKIP_UPDATE";

export type ThreadListState = Readonly<{
  threads: readonly ThreadListMetadata[];
  archivedThreads: readonly ThreadListMetadata[];
}>;

export type ThreadListRuntime = Readonly<{
  path: ThreadListRuntimePath;
  getState(): ThreadListState;

  /**
   * @deprecated Use `getThreadListItemById(idx).rename(newTitle)` instead. This will be removed in 0.6.0.
   */
  rename(threadId: string, newTitle: string): Promise<void>;
  /**
   * @deprecated Use `getThreadListItemById(idx).archive()` instead. This will be removed in 0.6.0.
   */
  archive(threadId: string): Promise<void>;
  /**
   * @deprecated Use `getThreadListItemById(idx).unarchive()` instead. This will be removed in 0.6.0.
   */
  unarchive(threadId: string): Promise<void>;
  /**
   * @deprecated Use `getThreadListItemById(idx).delete()` instead. This will be removed in 0.6.0.
   */
  delete(threadId: string): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;

  getThreadListItemById(threadId: string): ThreadListItemRuntime;
  getThreadListItemByIndex(idx: number): ThreadListItemRuntime;
  getThreadListArchivedItemByIndex(idx: number): ThreadListItemRuntime;
}>;

const getThreadListState = (
  threadList: ThreadListRuntimeCore,
): ThreadListState => {
  return {
    threads: threadList.threads,
    archivedThreads: threadList.archivedThreads,
  };
};

const THREAD_MANAGER_PATH = {
  ref: "ThreadList",
};

export type ThreadListRuntimeCoreBinding = ThreadListRuntimeCore;

export class ThreadListRuntimeImpl implements ThreadListRuntime {
  public get path() {
    return THREAD_MANAGER_PATH;
  }

  private _getState;
  constructor(private _core: ThreadListRuntimeCoreBinding) {
    const stateBinding = new LazyMemoizeSubject({
      path: THREAD_MANAGER_PATH,
      getState: () => getThreadListState(_core),
      subscribe: (callback) => _core.subscribe(callback),
    });

    this._getState = stateBinding.getState.bind(stateBinding);
  }

  public getState(): ThreadListState {
    return this._getState();
  }

  public rename(threadId: string, newTitle: string): Promise<void> {
    return this._core.rename(threadId, newTitle);
  }

  public archive(threadId: string): Promise<void> {
    return this._core.archive(threadId);
  }

  public unarchive(threadId: string): Promise<void> {
    return this._core.unarchive(threadId);
  }

  public delete(threadId: string): Promise<void> {
    return this._core.delete(threadId);
  }

  public subscribe(callback: () => void): Unsubscribe {
    return this._core.subscribe(callback);
  }

  public getThreadListItemByIndex(idx: number) {
    return new ThreadListItemRuntimeImpl(
      new LazyMemoizeSubject({
        path: {
          ref: this.path.ref + `${this.path.ref}.threadItems[${idx}]`,
          threadSelector: { type: "index", index: idx },
        },
        getState: () => {
          const threads = this._core.threads;
          const thread = threads[idx];
          if (!thread) return SKIP_UPDATE;
          return thread;
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }

  public getThreadListArchivedItemByIndex(idx: number) {
    return new ThreadListItemRuntimeImpl(
      new LazyMemoizeSubject({
        path: {
          ref: this.path.ref + `${this.path.ref}.archivedThreadItems[${idx}]`,
          threadSelector: { type: "archiveIndex", index: idx },
        },
        getState: () => {
          const threads = this._core.archivedThreads;
          const thread = threads[idx];
          if (!thread) return SKIP_UPDATE;
          return thread;
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }

  public getThreadListItemById(threadId: string) {
    return new ThreadListItemRuntimeImpl(
      new LazyMemoizeSubject({
        path: {
          ref:
            this.path.ref +
            `${this.path.ref}.threadItems[threadId=${threadId}]`,
          threadSelector: { type: "threadId", threadId },
        },
        getState: () => {
          const threadItem = this._core.getThreadMetadataById(threadId);
          if (!threadItem) return SKIP_UPDATE;
          return threadItem;
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }
}
