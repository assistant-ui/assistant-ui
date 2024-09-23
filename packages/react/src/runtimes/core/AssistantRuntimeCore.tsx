import { ThreadRuntimeCore } from "./ThreadRuntimeCore";
import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";

export type AssistantRuntimeCore = {
  readonly thread: ThreadRuntimeCore;

  switchToNewThread: () => void;

  switchToThread(threadId: string): void;
  /**
   * @deprecated Use `switchToNewThread` instead. This will be removed in 0.6.0.
   */
  switchToThread(threadId: string | null): void;

  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;

  subscribe: (callback: () => void) => Unsubscribe;
};
