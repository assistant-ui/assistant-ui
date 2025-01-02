import { PropsWithChildren } from "react";
import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadListRuntimeCore } from "./ThreadListRuntimeCore";

export type AssistantRuntimeCore = {
  readonly threadList: ThreadListRuntimeCore;

  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;

  __internal_RenderComponent?: React.FC<PropsWithChildren>;
};
