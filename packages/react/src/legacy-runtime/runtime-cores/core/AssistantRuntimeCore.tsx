import type { ModelContextProvider } from "@assistant-ui/core";
import type { Unsubscribe } from "@assistant-ui/core";
import { ThreadListRuntimeCore } from "./ThreadListRuntimeCore";

export type AssistantRuntimeCore = {
  readonly threads: ThreadListRuntimeCore;

  registerModelContextProvider: (provider: ModelContextProvider) => Unsubscribe;
  getModelContextProvider: () => ModelContextProvider;

  /**
   * EXPERIMENTAL: A component that is rendered inside the AssistantRuntimeProvider.
   *
   * Note: This field is expected to never change.
   * To update the component, use a zustand store.
   */
  readonly RenderComponent?: ((...args: any[]) => unknown) | undefined;
};
