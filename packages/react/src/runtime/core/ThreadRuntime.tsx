import type { ThreadState } from "../../context";
import type { Unsubscribe } from "../../utils/Unsubscribe";

export type ThreadRuntime = Readonly<
  ThreadState & {
    subscribe: (callback: () => void) => Unsubscribe;
  }
>;
