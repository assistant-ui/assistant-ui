import { createContext } from "react";
import { Store } from "../../utils/tap-store";
import { ThreadState } from "../../client/types/thread-types";

export const ThreadContext = createContext<
  Store<ThreadState, undefined> | undefined
>(undefined);
