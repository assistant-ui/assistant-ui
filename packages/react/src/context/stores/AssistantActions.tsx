import { create } from "zustand";
import { AssistantRuntime } from "../../runtimes";
import { MutableRefObject } from "react";

export type AssistantActionsState = Readonly<{
  switchToThread: (threadId: string | null) => void;
}>;

export const makeAssistantActionsStore = (
  runtimeRef: MutableRefObject<AssistantRuntime>,
) =>
  create<AssistantActionsState>(() =>
    Object.freeze({
      switchToThread: () => runtimeRef.current.switchToThread(null),
    }),
  );
