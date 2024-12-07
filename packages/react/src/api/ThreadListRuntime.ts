import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";
import { ThreadListRuntimeCore } from "../runtimes/core/ThreadListRuntimeCore";
import { Unsubscribe } from "../types";
import {
  ThreadListItemRuntime,
  ThreadListItemRuntimeImpl,
  ThreadListItemState,
} from "./ThreadListItemRuntime";
import { SKIP_UPDATE } from "./subscribable/SKIP_UPDATE";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";

export type ThreadListState = {
  readonly mainThreadId: string;
  readonly newThread: string | undefined;
  readonly threads: readonly string[];
  readonly archivedThreads: readonly string[];
};

export type ThreadListRuntime = {
  getState(): ThreadListState;

  subscribe(callback: () => void): Unsubscribe;

  readonly mainThreadListItem: ThreadListItemRuntime;
  getThreadListItemById(threadId: string): ThreadListItemRuntime;
  getThreadListItemByIndex(idx: number): ThreadListItemRuntime;
  getThreadListArchivedItemByIndex(idx: number): ThreadListItemRuntime;
};

const getThreadListState = (
  threadList: ThreadListRuntimeCore,
): ThreadListState => {
  return {
    mainThreadId: threadList.mainThreadId,
    newThread: threadList.newThreadId,
    threads: threadList.threadIds,
    archivedThreads: threadList.archivedThreadIds,
  };
};

const getThreadListItemState = (
  threadList: ThreadListRuntimeCore,
  threadId: string | undefined,
): ThreadListItemState | SKIP_UPDATE => {
  if (threadId === undefined) return SKIP_UPDATE;

  const threadData = threadList.getItemById(threadId);
  if (!threadData) return SKIP_UPDATE;
  return {
    id: threadData.threadId,
    threadId: threadData.threadId, // TODO remove in 0.8.0
    title: threadData.title,
    state: threadData.state,
    isMain: threadData.threadId === threadList.mainThreadId,
  };
};

export type ThreadListRuntimeCoreBinding = ThreadListRuntimeCore;

export class ThreadListRuntimeImpl implements ThreadListRuntime {
  private _getState;
  constructor(private _core: ThreadListRuntimeCoreBinding) {
    const stateBinding = new LazyMemoizeSubject({
      path: {},
      getState: () => getThreadListState(_core),
      subscribe: (callback) => _core.subscribe(callback),
    });

    this._getState = stateBinding.getState.bind(stateBinding);

    this._mainThreadListItemRuntime = new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref: `threadItems[main]`,
          threadSelector: { type: "main" },
        },
        getState: () => {
          return getThreadListItemState(this._core, this._core.mainThreadId);
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }

  public getState(): ThreadListState {
    return this._getState();
  }

  public subscribe(callback: () => void): Unsubscribe {
    return this._core.subscribe(callback);
  }

  private _mainThreadListItemRuntime;

  public get mainThreadListItem() {
    return this._mainThreadListItemRuntime;
  }

  public getThreadListItemByIndex(idx: number) {
    return new ThreadListItemRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ref: `threadItems[${idx}]`,
          threadSelector: { type: "index", index: idx },
        },
        getState: () => {
          return getThreadListItemState(this._core, this._core.threadIds[idx]);
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
          ref: `archivedThreadItems[${idx}]`,
          threadSelector: { type: "archiveIndex", index: idx },
        },
        getState: () => {
          return getThreadListItemState(
            this._core,
            this._core.archivedThreadIds[idx],
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
          ref: `threadItems[threadId=${threadId}]`,
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
