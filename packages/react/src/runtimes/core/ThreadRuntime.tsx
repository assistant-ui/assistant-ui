import { RuntimeCapabilities } from "../../context/stores/Thread";
import { ThreadActionsState } from "../../context/stores/ThreadActions";
import { ThreadMessage } from "../../types";
import type { Unsubscribe } from "../../types/Unsubscribe";

export type ThreadRuntime = ThreadActionsState &
  Readonly<{
    composer: ThreadRuntime.Composer;
    capabilities: Readonly<RuntimeCapabilities>;
    threadId: string;
    isDisabled: boolean;
    messages: readonly ThreadMessage[];
    subscribe: (callback: () => void) => Unsubscribe;
  }>;

export declare namespace ThreadRuntime {
  export type Composer = Readonly<{
    text: string;
    setText: (value: string) => void;
  }>;
}
