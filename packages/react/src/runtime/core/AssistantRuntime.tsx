import type { ComponentType } from "react";
import type { ThreadState } from "../../context/stores/Thread";

export type Unsubscribe = () => void;
export type AssistantRuntime = Readonly<ThreadState> & {
  subscribe: (callback: () => void) => Unsubscribe;
};

export type ReactAssistantRuntime = Readonly<ThreadState> & {
  unstable_synchronizer?: ComponentType;
};
