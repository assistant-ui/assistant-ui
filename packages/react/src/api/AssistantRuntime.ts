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
  readonly thread: ThreadRuntime;

  /**
   * The thread manager, to rename, archive and delete threads.
   */
  readonly threadList: ThreadListRuntime;

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
   * Register a model config provider. Model config providers are configuration such as system message, temperature, etc. that are set in the frontend.
   *
   * @param provider The model config provider to register.
   */
  registerModelConfigProvider(provider: ModelConfigProvider): Unsubscribe;
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

  public switchToThread(threadId: string) {
    return this._core.threadList.switchToThread(threadId);
  }

  public registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._core.registerModelConfigProvider(provider);
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
