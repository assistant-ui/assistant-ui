import { AssistantRuntimeCore } from "../runtimes/core/AssistantRuntimeCore";
import { NestedSubscriptionSubject } from "./subscribable/NestedSubscriptionSubject";
import { ModelConfigProvider } from "../types/ModelConfigTypes";
import {
  ThreadRuntime,
  ThreadRuntimeCoreBinding,
  ThreadRuntimeImpl,
} from "./ThreadRuntime";
import { Unsubscribe } from "../types";

export type AssistantRuntime = {
  thread: ThreadRuntime;

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
  implements Omit<AssistantRuntimeCore, "thread">, AssistantRuntime
{
  protected constructor(
    private readonly _core: AssistantRuntimeCore,
    private readonly _thread: ThreadRuntime,
  ) {}

  public get thread() {
    return this._thread;
  }

  public switchToNewThread() {
    return this._core.switchToNewThread();
  }

  public switchToThread(threadId: string): void;
  /**
   * @deprecated Use `switchToNewThread` instead. This will be removed in 0.6.0.
   */
  public switchToThread(threadId: string | null): void;
  public switchToThread(threadId: string | null) {
    return this._core.switchToThread(threadId);
  }

  public registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._core.registerModelConfigProvider(provider);
  }

  /**
   * @deprecated Thread is now static and never gets updated. This will be removed in 0.6.0.
   */
  public subscribe(callback: () => void) {
    return this._core.subscribe(callback);
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
        getState: () => _core.thread,
        subscribe: (callback) => _core.subscribe(callback),
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
