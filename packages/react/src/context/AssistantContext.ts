import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadState } from "./stores/Thread";
import type { ThreadComposerState } from "./stores/ThreadComposer";
import type { ThreadViewportState } from "./stores/ThreadViewport";

export type AssistantContextValue = {
  useViewport: UseBoundStore<StoreApi<ThreadViewportState>>;
  useThread: UseBoundStore<StoreApi<ThreadState>>;
  useComposer: UseBoundStore<StoreApi<ThreadComposerState>>;
};

export const AssistantContext = createContext<AssistantContextValue | null>(
  null,
);

export const useAssistantContext = (): AssistantContextValue => {
  const context = useContext(AssistantContext);
  if (!context)
    throw new Error("This component must be used within an AssistantProvider.");
  return context;
};
