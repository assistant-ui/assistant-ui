import { AssistantRuntimeCore } from "../runtimes/core/AssistantRuntimeCore";
import { NestedSubscriptionSubject } from "./subscribable/NestedSubscriptionSubject";
import { ModelConfigProvider } from "../types/ModelConfigTypes";
import {
  ThreadRuntime,
  ThreadRuntimeCoreBinding,
  ThreadRuntimeImpl,
} from "./ThreadRuntime";
import { Unsubscribe } from "../types";
import {
  ThreadManagerRuntime,
  ThreadManagerRuntimeImpl,
} from "./ThreadManagerRuntime";

export type AssistantRuntime = {
  thread: ThreadRuntime;
  threadManager: ThreadManagerRuntime;

  switchToNewThread(): void;

  switchToThread(threadId: string): void;
  /**
   * @deprecated Use `switchToNewThread` instead. This will be removed in 0.6.0.
   */
  switchToThread(threadId: string | null): void;

  registerModelConfigProvider(provider: ModelConfigProvider): Unsubscribe;

  /**
   * @deprecated Thread is now static and never gets updated. This will be removed in 0.6.0.
   */
  subscribe(callback: () => void): Unsubscribe;
};

export class AssistantRuntimeImpl
  implements
    Omit<AssistantRuntimeCore, "thread" | "threadManager">,
    AssistantRuntime
{
  public readonly threadManager;

  protected constructor(
    private readonly _core: AssistantRuntimeCore,
    private readonly _thread: ThreadRuntime,
  ) {
    this.threadManager = new ThreadManagerRuntimeImpl(_core.threadManager);
  }

  public get thread() {
    return this._thread;
  }

  public switchToNewThread() {
    return this._core.threadManager.switchToNewThread();
  }

  public switchToThread(threadId: string): void;
  /**
   * @deprecated Use `switchToNewThread` instead. This will be removed in 0.6.0.
   */
  public switchToThread(threadId: string | null): void;
  public switchToThread(threadId: string | null) {
    if (threadId === null) return this.switchToNewThread();
    return this._core.threadManager.switchToThread(threadId);
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
        getState: () => _core.threadManager.mainThread,
        subscribe: (callback) => _core.threadManager.subscribe(callback),
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
