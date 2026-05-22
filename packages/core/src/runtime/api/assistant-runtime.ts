import type { Unsubscribe } from "../../types/unsubscribe";
import type { ModelContextProvider } from "../../model-context/types";
import type { AssistantRuntimeCore } from "../interfaces/assistant-runtime-core";
import type { ThreadRuntime } from "./thread-runtime";
import {
  type ThreadListRuntime,
  ThreadListRuntimeImpl,
} from "./thread-list-runtime";

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
   * Register a model context provider. Model context providers are configuration such as system message, temperature, etc. that are set in the frontend.
   *
   * @param provider The model context provider to register.
   */
  registerModelContextProvider(provider: ModelContextProvider): Unsubscribe;
};

export class AssistantRuntimeImpl implements AssistantRuntime {
  public readonly threads;

  public readonly _thread: ThreadRuntime;

  public constructor(private readonly _core: AssistantRuntimeCore) {
    this.threads = new ThreadListRuntimeImpl(_core.threads);
    this._thread = this.threads.main;

    this.__internal_bindMethods();
  }

  protected __internal_bindMethods() {
    this.registerModelContextProvider =
      this.registerModelContextProvider.bind(this);
  }

  public get thread() {
    return this._thread;
  }

  public registerModelContextProvider(provider: ModelContextProvider) {
    return this._core.registerModelContextProvider(provider);
  }
}
