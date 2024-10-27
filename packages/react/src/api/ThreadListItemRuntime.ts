import { ThreadListMetadata } from "../runtimes/core/ThreadListRuntimeCore";
import { Unsubscribe } from "../types";
import { ThreadListItemRuntimePath } from "./RuntimePathTypes";
import { SubscribableWithState } from "./subscribable/Subscribable";
import { ThreadListRuntimeCoreBinding } from "./ThreadListRuntime";

export type ThreadListItemState = ThreadListMetadata;

export type ThreadListItemRuntime = Readonly<{
  path: ThreadListItemRuntimePath;
  getState(): ThreadListMetadata;

  rename(newTitle: string): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;

  subscribe(callback: () => void): Unsubscribe;
}>;

export type ThreadListItemStateBinding = SubscribableWithState<
  ThreadListItemState,
  ThreadListItemRuntimePath
>;

export class ThreadListItemRuntimeImpl implements ThreadListItemRuntime {
  public get path() {
    return this._core.path;
  }

  constructor(
    private _core: ThreadListItemStateBinding,
    private _ThreadListBinding: ThreadListRuntimeCoreBinding,
  ) {}

  public getState(): ThreadListItemState {
    return this._core.getState();
  }

  public rename(newTitle: string): Promise<void> {
    const state = this._core.getState();

    return this._ThreadListBinding.rename(state.threadId, newTitle);
  }

  public archive(): Promise<void> {
    const state = this._core.getState();

    return this._ThreadListBinding.archive(state.threadId);
  }

  public unarchive(): Promise<void> {
    const state = this._core.getState();

    return this._ThreadListBinding.unarchive(state.threadId);
  }

  public delete(): Promise<void> {
    const state = this._core.getState();

    return this._ThreadListBinding.delete(state.threadId);
  }

  public subscribe(callback: () => void): Unsubscribe {
    return this._core.subscribe(callback);
  }
}
