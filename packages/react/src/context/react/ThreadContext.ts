"use client";

import { createContext, useContext } from "react";
import type { ComposerState } from "../stores/Composer";
import type { ThreadState } from "../stores/Thread";
import type { ThreadViewportState } from "../stores/ThreadViewport";
import { ThreadActionsState } from "../stores/ThreadActions";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadMessagesState } from "../stores/ThreadMessages";

export type ThreadContextValue = {
  useThread: ReadonlyStore<ThreadState>;
  useThreadMessages: ReadonlyStore<ThreadMessagesState>;
  useThreadActions: ReadonlyStore<ThreadActionsState>;
  useComposer: ReadonlyStore<ComposerState>;
  useViewport: ReadonlyStore<ThreadViewportState>;
};

export const ThreadContext = createContext<ThreadContextValue | null>(null);

export const useThreadContext = (): ThreadContextValue => {
  const context = useContext(ThreadContext);
  if (!context)
    throw new Error(
      "This component must be used within an AssistantRuntimeProvider.",
    );
  return context;
};
