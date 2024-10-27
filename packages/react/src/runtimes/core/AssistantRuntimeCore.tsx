import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadListRuntimeCore } from "./ThreadListRuntimeCore";

export type AssistantRuntimeCore = {
  readonly threadList: ThreadListRuntimeCore;

  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
};
