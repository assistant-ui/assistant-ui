import { create } from "zustand";
import { AssistantRuntime } from "../../runtimes";
import { MutableRefObject } from "react";
import { ModelConfigProvider, Unsubscribe } from "../../types";

export type AssistantActionsState = Readonly<{
  switchToThread: (threadId: string | null) => void;
  registerModelConfigProvider: (provider: ModelConfigProvider) => Unsubscribe;
  getRuntime: () => AssistantRuntime;
}>;

export const makeAssistantActionsStore = (
  runtimeRef: MutableRefObject<AssistantRuntime>,
) =>
  create<AssistantActionsState>(() =>
    Object.freeze({
      switchToThread: () => runtimeRef.current.switchToThread(null),
      registerModelConfigProvider: (provider: ModelConfigProvider) =>
        runtimeRef.current.registerModelConfigProvider(provider),
      getRuntime: () => runtimeRef.current,
    }),
  );
