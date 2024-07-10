import type { ThreadState } from "../../context";
import { ThreadActionsState } from "../../context/stores/ThreadActions";
import { ThreadMessage } from "../../types";
import type { Unsubscribe } from "../../types/Unsubscribe";

export type ThreadRuntime = Readonly<
  ThreadState &
    ThreadActionsState & {
      messages: readonly ThreadMessage[];
      subscribe: (callback: () => void) => Unsubscribe;
    }
>;
