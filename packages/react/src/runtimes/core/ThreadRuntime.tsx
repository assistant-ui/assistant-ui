import { ThreadActionsState } from "../../context/stores/ThreadActions";
import { ThreadMessage } from "../../types";
import type { Unsubscribe } from "../../types/Unsubscribe";

export type ThreadRuntime = Readonly<
  Omit<ThreadActionsState, "getRuntime"> & {
    isDisabled: boolean;
    messages: readonly ThreadMessage[];
    subscribe: (callback: () => void) => Unsubscribe;
  }
>;
