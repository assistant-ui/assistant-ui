import type { MutableRefObject } from "react";
import { create } from "zustand";
import type { ThreadMessage } from "../../types/AssistantTypes";

export type ThreadState = Readonly<{
  messages: readonly ThreadMessage[];
  isRunning: boolean;
}>;

export const makeThreadStore = (runtimeRef: MutableRefObject<ThreadState>) => {
  return create<ThreadState>(() => ({
    messages: runtimeRef.current.messages,
    isRunning: runtimeRef.current.isRunning,
  }));
};
