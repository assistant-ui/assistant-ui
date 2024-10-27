import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";
import {
  ThreadManagerMetadata,
  ThreadManagerRuntimeCore,
} from "../runtimes/core/ThreadManagerRuntimeCore";
import { Unsubscribe } from "../types";
import { ThreadManagerRuntimePath } from "./RuntimePathTypes";
import {
  ThreadManagerItemRuntime,
  ThreadManagerItemRuntimeImpl,
} from "./ThreadManagerItemRuntime";
import { SKIP_UPDATE } from "./subscribable/SKIP_UPDATE";

export type ThreadManagerState = Readonly<{
  threads: readonly ThreadManagerMetadata[];
  archivedThreads: readonly ThreadManagerMetadata[];
}>;

export type ThreadManagerRuntime = Readonly<{
  path: ThreadManagerRuntimePath;
  getState(): ThreadManagerState;

  /**
   * @deprecated Use `getThreadManagerItemById(idx).rename(newTitle)` instead. This will be removed in 0.6.0.
   */
  rename(threadId: string, newTitle: string): Promise<void>;
  /**
   * @deprecated Use `getThreadManagerItemById(idx).archive()` instead. This will be removed in 0.6.0.
   */
  archive(threadId: string): Promise<void>;
  /**
   * @deprecated Use `getThreadManagerItemById(idx).unarchive()` instead. This will be removed in 0.6.0.
   */
  unarchive(threadId: string): Promise<void>;
  /**
   * @deprecated Use `getThreadManagerItemById(idx).delete()` instead. This will be removed in 0.6.0.
   */
  delete(threadId: string): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;

  getThreadManagerItemById(threadId: string): ThreadManagerItemRuntime;
  getThreadManagerItemByIndex(idx: number): ThreadManagerItemRuntime;
  getThreadManagerArchivedItemByIndex(idx: number): ThreadManagerItemRuntime;
}>;

const getThreadManagerState = (
  threadManager: ThreadManagerRuntimeCore,
): ThreadManagerState => {
  return {
    threads: threadManager.threads,
    archivedThreads: threadManager.archivedThreads,
  };
};

const THREAD_MANAGER_PATH = {
  ref: "threadManager",
};

export type ThreadManagerRuntimeCoreBinding = ThreadManagerRuntimeCore;

export class ThreadManagerRuntimeImpl implements ThreadManagerRuntime {
  public get path() {
    return THREAD_MANAGER_PATH;
  }

  private _getState;
  constructor(private _core: ThreadManagerRuntimeCoreBinding) {
    const stateBinding = new LazyMemoizeSubject({
      path: THREAD_MANAGER_PATH,
      getState: () => getThreadManagerState(_core),
      subscribe: (callback) => _core.subscribe(callback),
    });

    this._getState = stateBinding.getState.bind(stateBinding);
  }

  public getState(): ThreadManagerState {
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

  public getThreadManagerItemByIndex(idx: number) {
    return new ThreadManagerItemRuntimeImpl(
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

  public getThreadManagerArchivedItemByIndex(idx: number) {
    return new ThreadManagerItemRuntimeImpl(
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

  public getThreadManagerItemById(threadId: string) {
    return new ThreadManagerItemRuntimeImpl(
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
