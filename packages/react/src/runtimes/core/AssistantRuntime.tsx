import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { ThreadRuntime } from "./ThreadRuntime";

export type ThreadRuntimeWithSubscribe = {
  readonly thread: ThreadRuntime;
  subscribe: (callback: () => void) => Unsubscribe;
};

export type AssistantRuntime = ThreadRuntimeWithSubscribe & {
  switchToThread: (threadId: string | null) => void;
  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
};
