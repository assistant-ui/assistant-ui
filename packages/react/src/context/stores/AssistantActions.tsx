import { create } from "zustand";
import { AssistantRuntime } from "../../runtimes";
import { MutableRefObject } from "react";
import { ModelConfigProvider, Unsubscribe } from "../../types";

export type AssistantActionsState = Readonly<{
  /**
   * @deprecated Use `switchToNewThread` instead. This will be removed in 0.6.0.
   */
  switchToThread: (threadId: string | null) => void;
  switchToNewThread: () => void;
  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
}>;

export const makeAssistantActionsStore = (
  runtimeRef: MutableRefObject<AssistantRuntime>,
) =>
  create<AssistantActionsState>(() =>
    Object.freeze({
      switchToThread: () => runtimeRef.current.switchToThread(null),
      switchToNewThread: () => runtimeRef.current.switchToNewThread(),
      registerModelConfigProvider: (provider: ModelConfigProvider) =>
        runtimeRef.current.registerModelConfigProvider(provider),
      getRuntime: () => runtimeRef.current,
    }),
  );
