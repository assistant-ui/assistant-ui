import { ComponentType, PropsWithChildren } from "react";
import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadListRuntimeCore } from "./ThreadListRuntimeCore";

export type AssistantRuntimeCore = {
  readonly threadList: ThreadListRuntimeCore;

  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;

  /**
   * A Provider component that wraps the app via `AssistantRuntimeProvider`.
   *
   * Note: This field is expected to never change.
   * Refer to the source implementation of `ExternalStoreRuntimeCore`
   * for an example of updating the provider via a zustand store.
   */
  readonly Provider: ComponentType<PropsWithChildren> | undefined;
};
