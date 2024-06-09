import type { ThreadState } from "../../utils/context/stores/AssistantTypes";

export type Unsubscribe = () => void;
export type AssistantRuntime = Readonly<ThreadState> & {
  subscribe: (callback: () => void) => Unsubscribe;
};
