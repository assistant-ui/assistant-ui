import type { ThreadState } from "../../context";
import { ThreadActionsState } from "../../context/stores/ThreadActions";
import type { Unsubscribe } from "../../utils/Unsubscribe";

export type ThreadRuntime = Readonly<
  ThreadState &
    ThreadActionsState & {
      subscribe: (callback: () => void) => Unsubscribe;
    }
>;
