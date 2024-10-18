import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";
import {
  ThreadManagerMetadata,
  ThreadManagerRuntimeCore,
} from "../runtimes/core/ThreadManagerRuntimeCore";
import { Unsubscribe } from "../types";
import { ThreadManagerRuntimePath } from "./RuntimePathTypes";

export type ThreadManagerState = Readonly<{
  threads: readonly ThreadManagerMetadata[];
  archivedThreads: readonly ThreadManagerMetadata[];
}>;

export type ThreadManagerRuntime = Readonly<{
  path: ThreadManagerRuntimePath;
  getState(): ThreadManagerState;

  rename(threadId: string, newTitle: string): Promise<void>;
  archive(threadId: string): Promise<void>;
  unarchive(threadId: string): Promise<void>;
  delete(threadId: string): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;
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
}
