import type { ModelConfigProvider } from "../../utils/ModelConfigTypes";
import type { Unsubscribe } from "../../utils/Unsubscribe";
import type { ThreadRuntime } from "./ThreadRuntime";

export type AssistantRuntime = ThreadRuntime & {
  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
};
