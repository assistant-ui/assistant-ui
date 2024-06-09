import type { ThreadState } from "../../context/stores/Thread";

export type Unsubscribe = () => void;
export type AssistantRuntime = Readonly<ThreadState> & {
  subscribe: (callback: () => void) => Unsubscribe;
};
