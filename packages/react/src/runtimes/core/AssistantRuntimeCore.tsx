import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadManagerRuntimeCore } from "./ThreadManagerRuntimeCore";

export type AssistantRuntimeCore = {
  readonly threadManager: ThreadManagerRuntimeCore;

  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
};
