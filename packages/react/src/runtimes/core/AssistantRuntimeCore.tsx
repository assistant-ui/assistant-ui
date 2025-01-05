import { ComponentType } from "react";
import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadListRuntimeCore } from "./ThreadListRuntimeCore";

export type AssistantRuntimeCore = {
  readonly threadList: ThreadListRuntimeCore;

  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;

  /**
   * EXPERIMENTAL: A component that is rendered inside the AssistantRuntimeProvider.
   *
   * Note: This field is expected to never change.
   * To update the component, use a zustand store.
   */
  readonly RenderComponent?: ComponentType | undefined;
};
