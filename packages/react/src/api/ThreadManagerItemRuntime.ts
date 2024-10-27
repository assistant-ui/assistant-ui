import { ThreadManagerMetadata } from "../runtimes/core/ThreadManagerRuntimeCore";
import { Unsubscribe } from "../types";
import { ThreadManagerItemRuntimePath } from "./RuntimePathTypes";
import { SubscribableWithState } from "./subscribable/Subscribable";
import { ThreadManagerRuntimeCoreBinding } from "./ThreadManagerRuntime";

export type ThreadManagerItemState = ThreadManagerMetadata;

export type ThreadManagerItemRuntime = Readonly<{
  path: ThreadManagerItemRuntimePath;
  getState(): ThreadManagerMetadata;

  rename(newTitle: string): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;
}>;

export type ThreadManagerItemStateBinding = SubscribableWithState<
  ThreadManagerItemState,
  ThreadManagerItemRuntimePath
>;

export class ThreadManagerItemRuntimeImpl implements ThreadManagerItemRuntime {
  public get path() {
    return this._core.path;
  }

  constructor(
    private _core: ThreadManagerItemStateBinding,
    private _threadManagerBinding: ThreadManagerRuntimeCoreBinding,
  ) {}

  public getState(): ThreadManagerItemState {
    return this._core.getState();
  }

  public rename(newTitle: string): Promise<void> {
    const state = this._core.getState();

    return this._threadManagerBinding.rename(state.threadId, newTitle);
  }

  public archive(): Promise<void> {
    const state = this._core.getState();

    return this._threadManagerBinding.archive(state.threadId);
  }

  public unarchive(): Promise<void> {
    const state = this._core.getState();

    return this._threadManagerBinding.unarchive(state.threadId);
  }

  public delete(): Promise<void> {
    const state = this._core.getState();

    return this._threadManagerBinding.delete(state.threadId);
  }

  public subscribe(callback: () => void): Unsubscribe {
    return this._core.subscribe(callback);
  }
}
