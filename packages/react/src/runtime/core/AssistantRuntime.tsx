import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import type { ThreadRuntime } from "./ThreadRuntime";

export type AssistantRuntime = ThreadRuntime & {
  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
};
