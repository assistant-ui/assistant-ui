import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadState } from "./stores/Thread";
import type { ThreadComposerState } from "./stores/ThreadComposer";
import type { ThreadViewportState } from "./stores/ThreadViewport";

export type ThreadContextValue = {
  useThread: UseBoundStore<StoreApi<ThreadState>>;
  useComposer: UseBoundStore<StoreApi<ThreadComposerState>>;
  useViewport: UseBoundStore<StoreApi<ThreadViewportState>>;
};

export const ThreadContext = createContext<ThreadContextValue | null>(null);

export const useThreadContext = (): ThreadContextValue => {
  const context = useContext(ThreadContext);
  if (!context)
    throw new Error("This component must be used within an AssistantProvider.");
  return context;
};
