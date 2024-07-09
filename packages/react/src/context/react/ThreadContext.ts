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

export function useThreadContext(): ThreadContextValue;
export function useThreadContext(options: {
  optional: true;
}): ThreadContextValue | null;
export function useThreadContext(options?: { optional: true }) {
  const context = useContext(ThreadContext);
  if (!options?.optional && !context)
    throw new Error(
      "This component must be used within an AssistantRuntimeProvider.",
    );
  return context;
}
