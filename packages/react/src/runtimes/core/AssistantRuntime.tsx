import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { ThreadRuntime } from "./ThreadRuntime";

export type ThreadRuntimeWithSubscribe = {
  readonly thread: ThreadRuntime;
  subscribe: (callback: () => void) => Unsubscribe;
};

export type AssistantRuntime = ThreadRuntimeWithSubscribe & {
  switchToNewThread: () => void;

  switchToThread(threadId: string): void;
  /**
   * @deprecated Use `switchToNewThread` instead. This will be removed in 0.6.0.
   */
  switchToThread(threadId: string | null): void;

  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
};
