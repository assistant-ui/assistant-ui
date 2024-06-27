import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { ThreadRuntime } from "./ThreadRuntime";

export type AssistantRuntime = ThreadRuntime & {
  switchToThread: (threadId: string | null) => void;
  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
};
