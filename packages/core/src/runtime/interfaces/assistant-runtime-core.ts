import type { Unsubscribe } from "../../types/unsubscribe";
import type { ModelContextProvider } from "../../model-context/types";
import type { ThreadListRuntimeCore } from "./thread-list-runtime-core";

export type AssistantRuntimeCore = {
  readonly threads: ThreadListRuntimeCore;

  registerModelContextProvider: (provider: ModelContextProvider) => Unsubscribe;
  getModelContextProvider: () => ModelContextProvider;

  readonly RenderComponent?: ((...args: any[]) => unknown) | undefined;
};
