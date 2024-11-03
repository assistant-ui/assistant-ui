import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";
import { ThreadListRuntimeCore } from "../runtimes/core/ThreadListRuntimeCore";
import { Unsubscribe } from "../types";
import { ThreadListRuntimePath } from "./RuntimePathTypes";
import {
  ThreadListItemRuntime,
  ThreadListItemRuntimeImpl,
  ThreadListItemState,
} from "./ThreadListItemRuntime";
import { SKIP_UPDATE } from "./subscribable/SKIP_UPDATE";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";

export type ThreadListState = Readonly<{
  mainThreadId: string;
  newThread: string | undefined;
  threads: readonly string[];
  archivedThreads: readonly string[];
}>;

export type ThreadListRuntime = Readonly<{
  path: ThreadListRuntimePath;
  getState(): ThreadListState;

  subscribe(callback: () => void): Unsubscribe;

  getThreadListItemById(threadId: string): ThreadListItemRuntime;
  getThreadListItemByIndex(idx: number): ThreadListItemRuntime;
  getThreadListArchivedItemByIndex(idx: number): ThreadListItemRuntime;
}>;

const getThreadListState = (
  threadList: ThreadListRuntimeCore,
): ThreadListState => {
  return {
    mainThreadId: threadList.mainThread.metadata.threadId,
    newThread: threadList.newThread,
    threads: threadList.threads,
    archivedThreads: threadList.archivedThreads,
  };
};

const getThreadListItemState = (
  threadList: ThreadListRuntimeCore,
  threadId: string | undefined,
): ThreadListItemState | SKIP_UPDATE => {
  if (threadId === undefined) return SKIP_UPDATE;

  const threadData = threadList.getThreadMetadataById(threadId);
  if (!threadData) return SKIP_UPDATE;
  return {
    ...threadData,
    isMain: threadList.mainThread.metadata.threadId === threadId,
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

  public subscribe(callback: () => void): Unsubscribe {
    return this._core.subscribe(callback);
  }

  public getThreadListItemByIndex(idx: number) {
    return new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref: this.path.ref + `${this.path.ref}.threadItems[${idx}]`,
          threadSelector: { type: "index", index: idx },
        },
        getState: () => {
          return getThreadListItemState(this._core, this._core.threads[idx]);
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }

  public getThreadListArchivedItemByIndex(idx: number) {
    return new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref: this.path.ref + `${this.path.ref}.archivedThreadItems[${idx}]`,
          threadSelector: { type: "archiveIndex", index: idx },
        },
        getState: () => {
          return getThreadListItemState(
            this._core,
            this._core.archivedThreads[idx],
          );
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }

  public getThreadListItemById(threadId: string) {
    return new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref:
            this.path.ref +
            `${this.path.ref}.threadItems[threadId=${threadId}]`,
          threadSelector: { type: "threadId", threadId },
        },
        getState: () => {
          return getThreadListItemState(this._core, threadId);
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }
}
