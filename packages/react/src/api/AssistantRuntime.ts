import { AssistantRuntimeCore } from "../runtimes/core/AssistantRuntimeCore";
import { ModelContextProvider } from "../model-context/ModelContextTypes";
import {
  ThreadListItemRuntimeBinding,
  ThreadRuntime,
  ThreadRuntimeCoreBinding,
  ThreadRuntimeImpl,
} from "./ThreadRuntime";
import { Unsubscribe } from "../types";
import { ThreadListRuntime, ThreadListRuntimeImpl } from "./ThreadListRuntime";

export type AssistantRuntime = {
  /**
   * The threads in this assistant.
   */
  readonly threads: ThreadListRuntime;

  /**
   * The currently selected main thread. Equivalent to `threads.main`.
   */
  readonly thread: ThreadRuntime;

  /**
   * @deprecated This field was renamed to `threads.main`.
   */
  readonly threadList: ThreadListRuntime;

  /**
   * Switch to a new thread.
   *
   * @deprecated This method was moved to `threads.switchToNewThread`.
   */
  switchToNewThread(): void;

  /**
   * Switch to a thread.
   *
   * @param threadId The thread ID to switch to.
   * @deprecated This method was moved to `threads.switchToThread`.
   */
  switchToThread(threadId: string): void;

  /**
   * Register a model context provider. Model context providers are configuration such as system message, temperature, etc. that are set in the frontend.
   *
   * @param provider The model context provider to register.
   */
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;

  /**
   * @deprecated This method was renamed to `registerModelContextProvider`.
   */
  registerModelConfigProvider(provider: ModelContextProvider): Unsubscribe;
};

export class AssistantRuntimeImpl implements AssistantRuntime {
  public readonly threads;
  public get threadList() {
    return this.threads;
  }

  public readonly _thread: ThreadRuntime;

  protected constructor(
    private readonly _core: AssistantRuntimeCore,
    runtimeFactory: new (
      binding: ThreadRuntimeCoreBinding,
      threadListItemBinding: ThreadListItemRuntimeBinding,
    ) => ThreadRuntime = ThreadRuntimeImpl,
  ) {
    this.threads = new ThreadListRuntimeImpl(_core.threads, runtimeFactory);
    this._thread = this.threadList.main;
  }

  protected __internal_bindMethods() {
    this.switchToNewThread = this.switchToNewThread.bind(this);
    this.switchToThread = this.switchToThread.bind(this);
    this.registerModelContextProvider =
      this.registerModelContextProvider.bind(this);
  }

  public get thread() {
    return this._thread;
  }

  public switchToNewThread() {
    return this._core.threads.switchToNewThread();
  }

  public switchToThread(threadId: string) {
    return this._core.threads.switchToThread(threadId);
  }

  public registerModelContextProvider(provider: ModelContextProvider) {
    return this._core.registerModelContextProvider(provider);
  }

  public registerModelConfigProvider(provider: ModelContextProvider) {
    return this.registerModelContextProvider(provider);
  }

  public static create(
    _core: AssistantRuntimeCore,
    runtimeFactory: new (
      binding: ThreadRuntimeCoreBinding,
      threadListItemBinding: ThreadListItemRuntimeBinding,
    ) => ThreadRuntime = ThreadRuntimeImpl,
  ): AssistantRuntime {
    return new AssistantRuntimeImpl(_core, runtimeFactory);
  }
}
