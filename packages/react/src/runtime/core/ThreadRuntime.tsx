import type { ThreadState } from "../../context";

export type Unsubscribe = () => void;
export type ThreadRuntime = Readonly<
  ThreadState & {
    subscribe: (callback: () => void) => Unsubscribe;
  }
>;
