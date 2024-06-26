import type { ThreadState } from "../../context";
import { ThreadActionsState } from "../../context/stores/ThreadActions";
import type { Unsubscribe } from "../../types/Unsubscribe";

export type ThreadRuntime = Readonly<
  ThreadState &
    ThreadActionsState & {
      subscribe: (callback: () => void) => Unsubscribe;
    }
>;
