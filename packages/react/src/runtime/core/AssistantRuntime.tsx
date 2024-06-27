import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { ThreadRuntime } from "./ThreadRuntime";

export type AssistantRuntime = ThreadRuntime & {
  newThread: () => void;
  switchToThread: (threadId: string) => void;

  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
};
