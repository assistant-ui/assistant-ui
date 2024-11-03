import { ThreadMetadata } from "../runtimes/core/ThreadRuntimeCore";
import { Unsubscribe } from "../types";
import { ThreadListItemRuntimePath } from "./RuntimePathTypes";
import { SubscribableWithState } from "./subscribable/Subscribable";
import { ThreadListRuntimeCoreBinding } from "./ThreadListRuntime";

export type ThreadListItemState = ThreadMetadata & {
  isMain: boolean;
};

export type ThreadListItemRuntime = Readonly<{
  path: ThreadListItemRuntimePath;
  getState(): ThreadListItemState;

  switchTo(): Promise<void>;
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
    private _threadListBinding: ThreadListRuntimeCoreBinding,
  ) {}

  public getState(): ThreadListItemState {
    return this._core.getState();
  }

  public switchTo(): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.switchToThread(state.threadId);
  }

  public rename(newTitle: string): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.rename(state.threadId, newTitle);
  }

  public archive(): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.archive(state.threadId);
  }

  public unarchive(): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.unarchive(state.threadId);
  }

  public delete(): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.delete(state.threadId);
  }

  public subscribe(callback: () => void): Unsubscribe {
    return this._core.subscribe(callback);
  }
}
