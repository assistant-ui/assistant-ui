import { AssistantRuntimeCore } from "../runtimes/core/AssistantRuntimeCore";
import { NestedSubscriptionSubject } from "./subscribable/NestedSubscriptionSubject";
import { ModelConfigProvider } from "../types/ModelConfigTypes";
import {
  ThreadRuntime,
  ThreadRuntimeCoreBinding,
  ThreadRuntimeImpl,
} from "./ThreadRuntime";
import { Unsubscribe } from "../types";
import { ThreadListRuntime, ThreadListRuntimeImpl } from "./ThreadListRuntime";

export type AssistantRuntime = {
  /**
   * The currently selected main thread.
   */
  thread: ThreadRuntime;

  /**
   * The thread manager, to rename, archive and delete threads.
   */
  threadList: ThreadListRuntime;

  /**
   * Switch to a new thread.
   */
  switchToNewThread(): void;

  /**
   * Switch to a thread.
   *
   * @param threadId The thread ID to switch to.
   */
  switchToThread(threadId: string): void;
  /**
   * @deprecated Use `switchToNewThread` instead. This will be removed in 0.6.0.
   */
  switchToThread(threadId: string | null): void;

  /**
   * Register a model config provider. Model config providers are configuration such as system message, temperature, etc. that are set in the frontend.
   *
   * @param provider The model config provider to register.
   */
  registerModelConfigProvider(provider: ModelConfigProvider): Unsubscribe;

  /**
   * @deprecated Thread is now static and never gets updated. This will be removed in 0.6.0.
   */
  subscribe(callback: () => void): Unsubscribe;
};

export class AssistantRuntimeImpl
  implements
    Omit<AssistantRuntimeCore, "thread" | "threadList">,
    AssistantRuntime
{
  public readonly threadList;

  protected constructor(
    private readonly _core: AssistantRuntimeCore,
    private readonly _thread: ThreadRuntime,
  ) {
    this.threadList = new ThreadListRuntimeImpl(_core.threadList);
  }

  public get thread() {
    return this._thread;
  }

  public switchToNewThread() {
    return this._core.threadList.switchToNewThread();
  }

  public switchToThread(threadId: string): void;
  /**
   * @deprecated Use `switchToNewThread` instead. This will be removed in 0.6.0.
   */
  public switchToThread(threadId: string | null): void;
  public switchToThread(threadId: string | null) {
    if (threadId === null) return this.switchToNewThread();
    return this._core.threadList.switchToThread(threadId);
  }

  public registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._core.registerModelConfigProvider(provider);
  }

  /**
   * @deprecated Thread is now static and never gets updated. This will be removed in 0.6.0.
   */
  public subscribe() {
    return () => {};
  }

  protected static createMainThreadRuntime(
    _core: AssistantRuntimeCore,
    CustomThreadRuntime: new (
      binding: ThreadRuntimeCoreBinding,
    ) => ThreadRuntime = ThreadRuntimeImpl,
  ) {
    return new CustomThreadRuntime(
      new NestedSubscriptionSubject({
        path: {
          ref: "threads.main",
          threadSelector: { type: "main" },
        },
        getState: () => _core.threadList.mainThread,
        subscribe: (callback) => _core.threadList.subscribe(callback),
      }),
    );
  }

  public static create(
    _core: AssistantRuntimeCore,
    CustomThreadRuntime: new (
      binding: ThreadRuntimeCoreBinding,
    ) => ThreadRuntime = ThreadRuntimeImpl,
  ) {
    return new AssistantRuntimeImpl(
      _core,
      AssistantRuntimeImpl.createMainThreadRuntime(_core, CustomThreadRuntime),
    ) as AssistantRuntime;
  }
}
