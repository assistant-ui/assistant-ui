import { AssistantRuntimeCore } from "../runtimes/core/AssistantRuntimeCore";
import { ModelConfigProvider } from "../types/ModelConfigTypes";
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
   * @deprecated This field was moved to `threads.switchToNewThread`.
   */
  switchToNewThread(): void;

  /**
   * Switch to a thread.
   *
   * @param threadId The thread ID to switch to.
   * @deprecated This field was moved to `threads.switchToThread`.
   */
  switchToThread(threadId: string): void;

  /**
   * Register a model config provider. Model config providers are configuration such as system message, temperature, etc. that are set in the frontend.
   *
   * @param provider The model config provider to register.
   */
  registerModelConfigProvider(provider: ModelConfigProvider): Unsubscribe;
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
    this.registerModelConfigProvider =
      this.registerModelConfigProvider.bind(this);
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

  public registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._core.registerModelConfigProvider(provider);
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
