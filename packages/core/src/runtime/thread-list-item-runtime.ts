import type { Unsubscribe } from "../types";
import type { SubscribableWithState } from "../subscribable/subscribable";
import type { ThreadListItemRuntimePath } from "./paths";
import type { ThreadListRuntimeCoreBinding } from "./thread-list-runtime";

export type ThreadListItemEventType = "switchedTo" | "switchedAway";

import type { ThreadListItemState } from "./bindings";
import type { ThreadListItemStatus } from "./thread-list-runtime-core";

export type { ThreadListItemState, ThreadListItemStatus };

export type ThreadListItemRuntime = {
  readonly path: ThreadListItemRuntimePath;
  getState(): ThreadListItemState;

  initialize(): Promise<{ remoteId: string; externalId: string | undefined }>;
  generateTitle(): Promise<void>;

  switchTo(): Promise<void>;
  rename(newTitle: string): Promise<void>;
  archive(): Promise<void>;
  unarchive(): Promise<void>;
  delete(): Promise<void>;

  detach(): void;

  subscribe(callback: () => void): Unsubscribe;

  unstable_on(
    event: ThreadListItemEventType,
    callback: () => void,
  ): Unsubscribe;

  __internal_getRuntime(): ThreadListItemRuntime;
};

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
  ) {
    this.__internal_bindMethods();
  }

  protected __internal_bindMethods() {
    this.switchTo = this.switchTo.bind(this);
    this.rename = this.rename.bind(this);
    this.archive = this.archive.bind(this);
    this.unarchive = this.unarchive.bind(this);
    this.delete = this.delete.bind(this);
    this.initialize = this.initialize.bind(this);
    this.generateTitle = this.generateTitle.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unstable_on = this.unstable_on.bind(this);
    this.getState = this.getState.bind(this);
    this.detach = this.detach.bind(this);
  }

  public getState(): ThreadListItemState {
    return this._core.getState();
  }

  public switchTo(): Promise<void> {
    const state = this._core.getState();
    return this._threadListBinding.switchToThread(state.id);
  }

  public rename(newTitle: string): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.rename(state.id, newTitle);
  }

  public archive(): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.archive(state.id);
  }

  public unarchive(): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.unarchive(state.id);
  }

  public delete(): Promise<void> {
    const state = this._core.getState();

    return this._threadListBinding.delete(state.id);
  }

  public initialize(): Promise<{
    remoteId: string;
    externalId: string | undefined;
  }> {
    const state = this._core.getState();
    return this._threadListBinding.initialize(state.id);
  }

  public generateTitle(): Promise<void> {
    const state = this._core.getState();
    return this._threadListBinding.generateTitle(state.id);
  }

  public unstable_on(event: ThreadListItemEventType, callback: () => void) {
    let prevIsMain = this._core.getState().isMain;
    let prevThreadId = this._core.getState().id;
    return this.subscribe(() => {
      const currentState = this._core.getState();
      const newIsMain = currentState.isMain;
      const newThreadId = currentState.id;
      if (prevIsMain === newIsMain && prevThreadId === newThreadId) return;
      prevIsMain = newIsMain;
      prevThreadId = newThreadId;

      if (event === "switchedTo" && !newIsMain) return;
      if (event === "switchedAway" && newIsMain) return;
      callback();
    });
  }

  public subscribe(callback: () => void): Unsubscribe {
    return this._core.subscribe(callback);
  }

  public detach(): void {
    const state = this._core.getState();

    this._threadListBinding.detach(state.id);
  }

  public __internal_getRuntime(): ThreadListItemRuntime {
    return this;
  }
}
